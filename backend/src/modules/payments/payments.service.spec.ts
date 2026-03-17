import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';

const mockBuyer = { id: 'buyer-1', email: 'buyer@test.com', role: 'BUYER' as const };

const mockOrder = {
  id: 'order-1',
  buyerId: 'buyer-1',
  storeId: 'store-1',
  totalAmount: new Prisma.Decimal(25),
  status: 'PENDING',
  store: { id: 'store-1', ownerId: 'seller-1', commissionRate: new Prisma.Decimal(0.1) },
  buyer: { email: 'buyer@test.com' },
};

const mockPayment = {
  id: 'pay-1',
  orderId: 'order-1',
  gatewayTxId: 'mp-123',
  method: 'PIX',
  grossAmount: new Prisma.Decimal(25),
  commission: new Prisma.Decimal(2.5),
  netAmount: new Prisma.Decimal(22.5),
  status: 'PROCESSING',
  order: {
    buyerId: 'buyer-1',
    store: { ownerId: 'seller-1' },
  },
};

const mockPrisma = {
  order: {
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  payment: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
  product: { update: jest.fn() },
  $transaction: jest.fn(),
};

const mockMercadoPago = {
  createPixPayment: jest.fn(),
  createCardPayment: jest.fn(),
  refundPayment: jest.fn(),
};

const mockNotifications = {
  notifyNewOrder: jest.fn(),
};

describe('PaymentsService', () => {
  let service: PaymentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MercadoPagoService, useValue: mockMercadoPago },
        { provide: NotificationsGateway, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('initiatePayment — PIX', () => {
    it('creates PIX payment and returns QR code', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      mockMercadoPago.createPixPayment.mockResolvedValue({
        id: 'mp-123',
        status: 'pending',
        pixQrCode: 'qr-string',
        pixQrCodeBase64: 'base64-qr',
      });
      mockPrisma.payment.create.mockResolvedValue(mockPayment);

      const result = await service.initiatePayment('order-1', 'PIX', mockBuyer);

      expect(mockMercadoPago.createPixPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 2500, // 25 * 100
          orderId: 'order-1',
          payerEmail: 'buyer@test.com',
        }),
      );
      expect(result.data.pixQrCode).toBe('qr-string');
      expect(result.data.pixQrCodeBase64).toBe('base64-qr');
    });

    it('throws BadRequestException when user is not the buyer', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      const otherUser = { id: 'other-1', email: 'x@test.com', role: 'BUYER' as const };

      await expect(
        service.initiatePayment('order-1', 'PIX', otherUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when order is not PENDING', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue({ ...mockOrder, status: 'PAID' });

      await expect(
        service.initiatePayment('order-1', 'PIX', mockBuyer),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when duplicate non-FAILED payment exists', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      // checkDuplicatePayment calls payment.findFirst — return existing PROCESSING payment
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'pay-existing',
        orderId: 'order-1',
        status: 'PROCESSING',
      });

      await expect(
        service.initiatePayment('order-1', 'PIX', mockBuyer),
      ).rejects.toThrow(ConflictException);
    });

    it('allows payment when only FAILED payment exists', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      // checkDuplicatePayment filters status: { not: 'FAILED' } — null means no active payment
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockMercadoPago.createPixPayment.mockResolvedValue({
        id: 'mp-456',
        status: 'pending',
        pixQrCode: 'qr-string',
        pixQrCodeBase64: 'base64-qr',
      });
      mockPrisma.payment.create.mockResolvedValue({
        ...mockPayment,
        gatewayTxId: 'mp-456',
      });

      const result = await service.initiatePayment('order-1', 'PIX', mockBuyer);

      expect(result.data.pixQrCode).toBe('qr-string');
      expect(mockMercadoPago.createPixPayment).toHaveBeenCalled();
    });
  });

  describe('initiatePayment — CREDIT_CARD', () => {
    it('throws BadRequestException when cardToken is missing', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);

      await expect(
        service.initiatePayment('order-1', 'CREDIT_CARD', mockBuyer),
      ).rejects.toThrow(BadRequestException);
    });

    it('confirms order immediately when card is approved', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      mockMercadoPago.createCardPayment.mockResolvedValue({
        id: 'mp-card-1',
        status: 'approved',
      });
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      // Mock interactive transaction for confirmOrderWithStockDecrement
      mockPrisma.$transaction.mockImplementation(async (cbOrArray, _opts?) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray({
            order: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                ...mockOrder,
                items: [{ productId: 'prod-1', quantity: 1, product: { stockQty: 10 } }],
                store: { id: 'store-1', ownerId: 'seller-1', name: 'Loja 1' },
                buyer: { name: 'Comprador' },
              }),
              update: jest.fn(),
            },
            product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
            payment: { update: jest.fn() },
          });
        }
        return [];
      });

      const result = await service.initiatePayment('order-1', 'CREDIT_CARD', mockBuyer, 'card-token');

      expect(result.data.gatewayTxId).toBe('mp-card-1');
    });

    it('throws BadRequestException when card is rejected', async () => {
      mockPrisma.order.findUniqueOrThrow.mockResolvedValue(mockOrder);
      mockMercadoPago.createCardPayment.mockResolvedValue({
        id: 'mp-card-2',
        status: 'rejected',
        statusDetail: 'cc_rejected_insufficient_amount',
      });

      await expect(
        service.initiatePayment('order-1', 'CREDIT_CARD', mockBuyer, 'card-token'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleOrderPaid', () => {
    it('confirms order when payment found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ orderId: 'order-1', gatewayTxId: 'mp-123' });
      // Mock interactive transaction for confirmOrderWithStockDecrement
      mockPrisma.$transaction.mockImplementation(async (cbOrArray, _opts?) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray({
            order: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                ...mockOrder,
                items: [{ productId: 'prod-1', quantity: 1, product: { stockQty: 10 } }],
                store: { id: 'store-1', ownerId: 'seller-1', name: 'Loja 1' },
                buyer: { name: 'Comprador' },
              }),
              update: jest.fn(),
            },
            product: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
            payment: { update: jest.fn() },
          });
        }
        return [];
      });

      await service.handleOrderPaid('mp-123');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('does nothing when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await service.handleOrderPaid('unknown-tx');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('handles idempotent call when order already PAID', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ orderId: 'order-1', gatewayTxId: 'mp-123' });
      // Mock $transaction to invoke its callback (confirmOrderWithStockDecrement uses interactive tx)
      mockPrisma.$transaction.mockImplementation(async (cbOrArray, _opts?) => {
        if (typeof cbOrArray === 'function') {
          return cbOrArray({
            order: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                ...mockOrder,
                status: 'PAID', // already confirmed
                items: [{ productId: 'prod-1', quantity: 1, product: { stockQty: 10 } }],
                store: { id: 'store-1', ownerId: 'seller-1', name: 'Loja 1' },
                buyer: { name: 'Comprador' },
              }),
            },
            product: { updateMany: jest.fn() },
            payment: { update: jest.fn() },
          });
        }
        return [];
      });

      const result = await service.handleOrderPaid('mp-123');

      // handleOrderPaid returns void but confirmOrderWithStockDecrement returns true
      // The key assertion: $transaction was called but stock was NOT decremented
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      // product.updateMany should not have been called since order was already PAID
      const txCallback = mockPrisma.$transaction.mock.calls[0][0];
      const mockTx = {
        order: {
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            ...mockOrder,
            status: 'PAID',
            items: [{ productId: 'prod-1', quantity: 1, product: { stockQty: 10 } }],
            store: { id: 'store-1', ownerId: 'seller-1', name: 'Loja 1' },
            buyer: { name: 'Comprador' },
          }),
        },
        product: { updateMany: jest.fn() },
        payment: { update: jest.fn() },
      };
      // Re-invoke the callback to verify it returns early without modifying stock
      const txResult = await txCallback(mockTx);
      expect(txResult).toEqual({ alreadyPaid: true, order: expect.objectContaining({ status: 'PAID' }) });
      expect(mockTx.product.updateMany).not.toHaveBeenCalled();
      expect(mockTx.payment.update).not.toHaveBeenCalled();
      // notifyNewOrder should NOT be called for idempotent path
      expect(mockNotifications.notifyNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed', () => {
    it('updates payment and order to failed/cancelled', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue({ orderId: 'order-1', gatewayTxId: 'mp-123' });
      mockPrisma.$transaction.mockResolvedValue([]);

      await service.handlePaymentFailed('mp-123');

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('does nothing when payment not found', async () => {
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await service.handlePaymentFailed('unknown-tx');

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('getPaymentByOrder', () => {
    it('returns payment when user is the buyer', async () => {
      mockPrisma.payment.findUniqueOrThrow.mockResolvedValue(mockPayment);

      const result = await service.getPaymentByOrder('order-1', mockBuyer);

      expect(result.data).toBeDefined();
    });

    it('throws ForbiddenException when user is not buyer/seller/admin', async () => {
      mockPrisma.payment.findUniqueOrThrow.mockResolvedValue(mockPayment);
      const otherUser = { id: 'user-99', email: 'x@test.com', role: 'BUYER' as const };

      await expect(service.getPaymentByOrder('order-1', otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
