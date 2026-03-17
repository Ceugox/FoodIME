import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock expo-server-sdk before importing PushService (ESM module)
jest.mock('expo-server-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: jest.fn(),
  })),
  Expo: jest.fn(),
}));
import { PushService } from '../notifications/push.service';

const mockBuyer = { id: 'buyer-1', email: 'buyer@test.com', role: 'BUYER' as const };
const mockSeller = { id: 'seller-1', email: 'seller@test.com', role: 'SELLER' as const };
const mockAdmin = { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' as const };

const mockStore = { id: 'store-1', ownerId: 'seller-1', name: 'Loja 1' };
const mockProducts = [
  { id: 'prod-1', name: 'Coxinha', price: new Prisma.Decimal(5), stockQty: 20, storeId: 'store-1', isAvailable: true },
  { id: 'prod-2', name: 'Pastel', price: new Prisma.Decimal(7), stockQty: 10, storeId: 'store-1', isAvailable: true },
];

const mockOrder = {
  id: 'order-1',
  buyerId: 'buyer-1',
  storeId: 'store-1',
  totalAmount: new Prisma.Decimal(17),
  code: 'ABC123',
  status: 'PENDING',
  createdAt: new Date(),
  items: [
    { productId: 'prod-1', quantity: 2, priceAtPurchase: new Prisma.Decimal(5), product: { name: 'Coxinha', imageUrl: null } },
    { productId: 'prod-2', quantity: 1, priceAtPurchase: new Prisma.Decimal(7), product: { name: 'Pastel', imageUrl: null } },
  ],
  store: { id: 'store-1', name: 'Loja 1', ownerId: 'seller-1' },
  buyer: { id: 'buyer-1', name: 'Comprador', phone: '21999' },
};

const mockPrisma = {
  product: { findMany: jest.fn() },
  order: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  orderItem: { deleteMany: jest.fn() },
  payment: { deleteMany: jest.fn() },
  store: { findUnique: jest.fn() },
  $transaction: jest.fn(),
};

const mockPush = {
  sendPushNotification: jest.fn().mockResolvedValue(undefined),
};

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: PushService, useValue: mockPush },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = {
      storeId: 'store-1',
      items: [
        { productId: 'prod-1', quantity: 2 },
        { productId: 'prod-2', quantity: 1 },
      ],
    };

    it('creates order with correct total and price snapshot', async () => {
      mockPrisma.product.findMany.mockResolvedValue(mockProducts);
      mockPrisma.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(dto, mockBuyer);

      expect(mockPrisma.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerId: 'buyer-1',
            storeId: 'store-1',
          }),
        }),
      );
      expect(result.data).toEqual(mockOrder);
    });

    it('throws BadRequestException when products are unavailable', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProducts[0]]); // only 1 of 2

      await expect(service.create(dto, mockBuyer)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when stock is insufficient', async () => {
      const lowStock = [
        { ...mockProducts[0], stockQty: 1 }, // needs 2
        mockProducts[1],
      ];
      mockPrisma.product.findMany.mockResolvedValue(lowStock);

      await expect(service.create(dto, mockBuyer)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByBuyer', () => {
    it('returns buyer orders after cleanup', async () => {
      // cleanupExpiredOrders path
      mockPrisma.order.findMany
        .mockResolvedValueOnce([]) // no expired orders
        .mockResolvedValueOnce([mockOrder]); // buyer orders

      const result = await service.findByBuyer(mockBuyer);

      expect(result.data).toHaveLength(1);
    });
  });

  describe('findBySeller', () => {
    it('returns seller store orders', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.order.findMany.mockResolvedValue([mockOrder]);

      const result = await service.findBySeller(mockSeller);

      expect(result.data).toHaveLength(1);
    });

    it('returns empty when seller has no store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      const result = await service.findBySeller(mockSeller);

      expect(result.data).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns order when user is the buyer', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);

      const result = await service.findOne('order-1', mockBuyer);

      expect(result.data).toEqual(mockOrder);
    });

    it('returns order when user is admin', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      mockPrisma.store.findUnique.mockResolvedValue(null); // not the seller

      const result = await service.findOne('order-1', mockAdmin);

      expect(result.data).toEqual(mockOrder);
    });

    it('throws ForbiddenException when user is neither buyer nor seller nor admin', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      mockPrisma.store.findUnique.mockResolvedValue(null);

      const randomUser = { id: 'user-99', email: 'x@test.com', role: 'BUYER' as const };
      await expect(service.findOne('order-1', randomUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStatus', () => {
    it('updates status when user is the store owner', async () => {
      const paidOrder = { ...mockOrder, status: 'PAID' };
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(paidOrder);
      mockPrisma.order.update.mockResolvedValue({ ...paidOrder, status: 'READY' });

      const result = await service.updateStatus('order-1', 'READY', mockSeller);

      expect(result.data.status).toBe('READY');
    });

    it('sends push notification when status changes to READY', async () => {
      const orderWithPush = {
        ...mockOrder,
        status: 'PAID',
        buyer: { name: 'Comprador', pushToken: 'expo-push-token' },
      };
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(orderWithPush);
      mockPrisma.order.update.mockResolvedValue({ ...mockOrder, status: 'READY' });

      await service.updateStatus('order-1', 'READY', mockSeller);

      expect(mockPush.sendPushNotification).toHaveBeenCalledWith(
        'expo-push-token',
        'Pedido pronto!',
        expect.any(String),
        { orderId: 'order-1' },
      );
    });

    it('throws ForbiddenException when user is not the seller or admin', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);

      await expect(service.updateStatus('order-1', 'CANCELLED', mockBuyer)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException for invalid transition PENDING → READY', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: 'PENDING',
        store: { id: 'store-1', name: 'Loja 1', ownerId: 'seller-1' },
        buyer: { name: 'Comprador', pushToken: null },
      };
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);

      await expect(service.updateStatus('order-1', 'READY', mockSeller)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for invalid transition PICKED_UP → CANCELLED', async () => {
      const pickedUpOrder = {
        ...mockOrder,
        status: 'PICKED_UP',
        store: { id: 'store-1', name: 'Loja 1', ownerId: 'seller-1' },
        buyer: { name: 'Comprador', pushToken: null },
      };
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(pickedUpOrder);

      await expect(service.updateStatus('order-1', 'CANCELLED', mockSeller)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('allows valid transition PAID → READY', async () => {
      const paidOrder = {
        ...mockOrder,
        status: 'PAID',
        store: { id: 'store-1', name: 'Loja 1', ownerId: 'seller-1' },
        buyer: { name: 'Comprador', pushToken: null },
      };
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(paidOrder);
      mockPrisma.order.update.mockResolvedValue({ ...paidOrder, status: 'READY' });

      const result = await service.updateStatus('order-1', 'READY', mockSeller);

      expect(result.data.status).toBe('READY');
    });
  });

  describe('cleanupExpiredOrders', () => {
    it('deletes expired PENDING orders', async () => {
      const expiredOrders = [{ id: 'old-1' }, { id: 'old-2' }];
      mockPrisma.order.findMany.mockResolvedValue(expiredOrders);
      mockPrisma.$transaction.mockResolvedValue([]);

      const count = await service.cleanupExpiredOrders();

      expect(count).toBe(2);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('returns 0 when no expired orders', async () => {
      mockPrisma.order.findMany.mockResolvedValue([]);

      const count = await service.cleanupExpiredOrders();

      expect(count).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
