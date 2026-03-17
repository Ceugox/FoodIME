import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockUser = { id: 'user-1', email: 'seller@test.com', role: 'SELLER' as const };
const mockStore = { id: 'store-1', ownerId: 'user-1', name: 'Loja 1' };
const mockProduct = {
  id: 'prod-1',
  name: 'Coxinha',
  price: 5.5,
  stockQty: 20,
  imageUrl: null,
  isAvailable: true,
  storeId: 'store-1',
  store: mockStore,
};

const mockPrisma = {
  store: { findUnique: jest.fn() },
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Coxinha', price: 5.5, stockQty: 20 };

    it('creates product when seller has a store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);
      mockPrisma.product.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto as any, mockUser);

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({ where: { ownerId: 'user-1' } });
      expect(mockPrisma.product.create).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual(mockProduct);
    });

    it('throws NotFoundException when seller has no store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      await expect(service.create(dto as any, mockUser)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.product.create).not.toHaveBeenCalled();
    });
  });

  describe('findByStore', () => {
    it('returns available products for a store', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);

      const result = await service.findByStore('store-1');

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith({
        where: { storeId: 'store-1', isAvailable: true },
      });
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns product with store info', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);

      const result = await service.findOne('prod-1');

      expect(result.data).toEqual(mockProduct);
    });
  });

  describe('update', () => {
    it('updates product when user is the store owner', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, name: 'Coxinha Premium' });

      const result = await service.update('prod-1', { name: 'Coxinha Premium' } as any, mockUser);

      expect(result.data.name).toBe('Coxinha Premium');
    });

    it('throws ForbiddenException when user is not the store owner', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);
      const otherUser = { id: 'user-2', email: 'other@test.com', role: 'SELLER' as const };

      await expect(service.update('prod-1', { name: 'X' } as any, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('soft-deletes product by setting isAvailable to false', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, isAvailable: false });

      const result = await service.remove('prod-1', mockUser);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { isAvailable: false },
      });
      expect(result.message).toContain('removido');
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);
      const otherUser = { id: 'user-2', email: 'other@test.com', role: 'SELLER' as const };

      await expect(service.remove('prod-1', otherUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateStock', () => {
    it('updates stock quantity', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, stockQty: 50 });

      const result = await service.updateStock('prod-1', 50, mockUser);

      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stockQty: 50 },
      });
      expect(result.data.stockQty).toBe(50);
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      mockPrisma.product.findUniqueOrThrow.mockResolvedValue(mockProduct);
      const otherUser = { id: 'user-2', email: 'other@test.com', role: 'SELLER' as const };

      await expect(service.updateStock('prod-1', 50, otherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
