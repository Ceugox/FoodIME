import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const mockUser = {
  id: 'user-1',
  name: 'João',
  email: 'joao@test.com',
  phone: '21999',
  role: 'SELLER',
  status: 'PENDING',
  store: { id: 'store-1', name: 'Loja do João' },
};

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  refreshToken: {
    deleteMany: jest.fn(),
  },
  store: {
    findMany: jest.fn(),
    update: jest.fn(),
    findUniqueOrThrow: jest.fn(),
  },
  order: {
    count: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
    deleteMany: jest.fn(),
  },
  orderItem: { deleteMany: jest.fn() },
  payment: {
    aggregate: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  payout: {
    create: jest.fn(),
    findMany: jest.fn(),
    aggregate: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEmail = {
  sendSellerApprovedEmail: jest.fn().mockResolvedValue(undefined),
  sendSellerRejectedEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('returns users filtered by role with pagination meta', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers('SELLER');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'SELLER', deletedAt: null }),
          skip: 0,
          take: 20,
        }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: expect.objectContaining({ role: 'SELLER', deletedAt: null }),
      });
      expect(result.data).toHaveLength(1);
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
    });

    it('returns users filtered by search term', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getUsers(undefined, 'João');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [
              { name: { contains: 'João', mode: 'insensitive' } },
              { email: { contains: 'João', mode: 'insensitive' } },
            ],
          }),
        }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('returns all users when no filters (with deletedAt: null)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      await service.getUsers();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null },
      });
    });

    it('returns correct pagination meta for page 2', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(25);

      const result = await service.getUsers(undefined, undefined, undefined, 2, 10);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        }),
      );
      expect(result.meta).toEqual({ total: 25, page: 2, limit: 10, totalPages: 3 });
    });

    it('filters by status', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getUsers(undefined, undefined, 'ACTIVE');

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE', deletedAt: null }),
        }),
      );
    });
  });

  describe('updateUserStatus', () => {
    it('activates seller and sends approval email', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'ACTIVE' });

      const result = await service.updateUserStatus('user-1', 'ACTIVE');

      expect(mockEmail.sendSellerApprovedEmail).toHaveBeenCalledWith('joao@test.com', 'Loja do João');
      expect(result.data.status).toBe('ACTIVE');
    });

    it('blocks user and sends rejection email', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'BLOCKED' });

      await service.updateUserStatus('user-1', 'BLOCKED', 'Violação de regras');

      expect(mockEmail.sendSellerRejectedEmail).toHaveBeenCalledWith('joao@test.com', 'Violação de regras');
    });

    it('closes store when blocking a seller with a store', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, status: 'BLOCKED' });

      await service.updateUserStatus('user-1', 'BLOCKED');

      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { isOpen: false },
      });
    });

    it('does not close store when blocking a user without a store', async () => {
      const userWithoutStore = { ...mockUser, store: null };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(userWithoutStore);
      mockPrisma.user.update.mockResolvedValue({ ...userWithoutStore, status: 'BLOCKED' });

      await service.updateUserStatus('user-1', 'BLOCKED');

      expect(mockPrisma.store.update).not.toHaveBeenCalled();
    });
  });

  describe('updateStoreCommission', () => {
    it('updates commission rate within valid range', async () => {
      mockPrisma.store.update.mockResolvedValue({ id: 'store-1', name: 'Loja', commissionRate: 0.15 });

      const result = await service.updateStoreCommission('store-1', 0.15);

      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { commissionRate: 0.15 },
        select: { id: true, name: true, commissionRate: true },
      });
      expect(result.data.commissionRate).toBe(0.15);
    });

    it('throws BadRequestException when rate is too high', async () => {
      await expect(service.updateStoreCommission('store-1', 0.50)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException when rate is negative', async () => {
      await expect(service.updateStoreCommission('store-1', -0.1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createPayout', () => {
    it('creates a payout for a store', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue({ id: 'store-1' });
      mockPrisma.payout.create.mockResolvedValue({
        id: 'payout-1',
        storeId: 'store-1',
        amount: 100,
        note: 'Repasse semanal',
      });

      const result = await service.createPayout('store-1', 100, 'Repasse semanal');

      expect(result.data.amount).toBe(100);
    });

    it('throws BadRequestException when amount is zero or negative', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue({ id: 'store-1' });

      await expect(service.createPayout('store-1', 0)).rejects.toThrow(BadRequestException);
      await expect(service.createPayout('store-1', -10)).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteUser', () => {
    it('soft deletes user via $transaction and returns success message', async () => {
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(mockUser);
      mockPrisma.$transaction.mockResolvedValue([{}, {}, {}]);

      const result = await service.deleteUser('user-1');

      expect(mockPrisma.user.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        include: { store: true },
      });
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.anything(), // user.update (soft delete + BLOCKED)
          expect.anything(), // refreshToken.deleteMany
          expect.anything(), // store.update (close store)
        ]),
      );
      expect(result.message).toContain('removido');
    });

    it('soft deletes user without store (no store.update in transaction)', async () => {
      const userWithoutStore = { ...mockUser, store: null };
      mockPrisma.user.findUniqueOrThrow.mockResolvedValue(userWithoutStore);
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.deleteUser('user-1');

      // Transaction should have exactly 2 items (user.update + refreshToken.deleteMany)
      expect(mockPrisma.$transaction).toHaveBeenCalledWith(
        expect.any(Array),
      );
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0];
      expect(transactionArg).toHaveLength(2);
      expect(result.message).toContain('removido');
    });
  });

  describe('getStores', () => {
    it('returns all stores with owner info', async () => {
      const mockStores = [
        {
          id: 'store-1',
          name: 'Loja do João',
          owner: { id: 'user-1', name: 'João', email: 'joao@test.com' },
        },
      ];
      mockPrisma.store.findMany.mockResolvedValue(mockStores);

      const result = await service.getStores();

      expect(mockPrisma.store.findMany).toHaveBeenCalledWith({
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
        orderBy: { name: 'asc' },
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].owner.name).toBe('João');
    });
  });

  describe('getTransactions', () => {
    const mockPayment = {
      id: 'pay-1',
      method: 'PIX',
      status: 'PAID',
      grossAmount: 100,
      commission: 10,
      netAmount: 90,
      createdAt: new Date(),
      order: {
        code: 'ORD-001',
        buyer: { name: 'Maria' },
        store: { name: 'Loja do João' },
      },
    };

    it('returns transactions with pagination meta', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);
      mockPrisma.payment.count.mockResolvedValue(1);
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { grossAmount: 100, commission: 10, netAmount: 90 },
        _count: 1,
      });

      const result = await service.getTransactions();

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 50,
        }),
      );
      expect(result.data.payments).toHaveLength(1);
      expect(result.data.payments[0].orderCode).toBe('ORD-001');
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 50, totalPages: 1 });
    });

    it('filters by method and status', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(0);
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { grossAmount: null, commission: null, netAmount: null },
        _count: 0,
      });

      await service.getTransactions('PIX', 'PAID');

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { method: 'PIX', status: 'PAID' },
        }),
      );
      expect(mockPrisma.payment.count).toHaveBeenCalledWith({
        where: { method: 'PIX', status: 'PAID' },
      });
    });

    it('returns correct pagination for page 2', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([]);
      mockPrisma.payment.count.mockResolvedValue(75);
      mockPrisma.payment.aggregate.mockResolvedValue({
        _sum: { grossAmount: null, commission: null, netAmount: null },
        _count: 0,
      });

      const result = await service.getTransactions(undefined, undefined, 2, 50);

      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        }),
      );
      expect(result.meta).toEqual({ total: 75, page: 2, limit: 50, totalPages: 2 });
    });
  });
});
