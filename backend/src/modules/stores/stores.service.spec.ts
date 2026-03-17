import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { StoresService } from './stores.service';
import { PrismaService } from '../../prisma/prisma.service';

const mockUser = { id: 'user-1', email: 'seller@test.com', role: 'SELLER' as const };
const mockStore = {
  id: 'store-1',
  ownerId: 'user-1',
  name: 'Loja do João',
  description: 'Salgados',
  isOpen: false,
  commissionRate: 0.1,
  products: [],
};

const mockPrisma = {
  store: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

describe('StoresService', () => {
  let service: StoresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoresService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<StoresService>(StoresService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto = { name: 'Loja do João', description: 'Salgados' };

    it('creates store when user has no existing store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);
      mockPrisma.store.create.mockResolvedValue(mockStore);

      const result = await service.create(dto as any, mockUser);

      expect(mockPrisma.store.create).toHaveBeenCalledWith({
        data: { ...dto, ownerId: 'user-1' },
      });
      expect(result.data).toEqual(mockStore);
    });

    it('throws ConflictException when user already has a store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      await expect(service.create(dto as any, mockUser)).rejects.toThrow(ConflictException);
      expect(mockPrisma.store.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns open stores when no search provided', async () => {
      mockPrisma.store.findMany.mockResolvedValue([mockStore]);

      const result = await service.findAll();

      expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isOpen: true } }),
      );
      expect(result.data).toHaveLength(1);
    });

    it('searches by name/description when search provided', async () => {
      mockPrisma.store.findMany.mockResolvedValue([mockStore]);

      const result = await service.findAll('Salgados');

      expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'Salgados', mode: 'insensitive' } },
              { description: { contains: 'Salgados', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('returns store with products and owner', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue(mockStore);

      const result = await service.findOne('store-1');

      expect(result.data).toEqual(mockStore);
    });
  });

  describe('findMyStore', () => {
    it('returns the user own store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      const result = await service.findMyStore(mockUser);

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { ownerId: 'user-1' } }),
      );
      expect(result.data).toEqual(mockStore);
    });

    it('returns null when user has no store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      const result = await service.findMyStore(mockUser);

      expect(result.data).toBeNull();
    });
  });

  describe('update', () => {
    it('updates store when user is the owner', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue(mockStore);
      mockPrisma.store.update.mockResolvedValue({ ...mockStore, name: 'Novo Nome' });

      const result = await service.update('store-1', { name: 'Novo Nome' } as any, mockUser);

      expect(result.data.name).toBe('Novo Nome');
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue(mockStore);
      const otherUser = { id: 'user-2', email: 'other@test.com', role: 'SELLER' as const };

      await expect(service.update('store-1', { name: 'X' } as any, otherUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('toggleOpen', () => {
    it('toggles isOpen from false to true', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue({ ...mockStore, isOpen: false });
      mockPrisma.store.update.mockResolvedValue({ ...mockStore, isOpen: true });

      const result = await service.toggleOpen('store-1', mockUser);

      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { isOpen: true },
      });
      expect(result.data.isOpen).toBe(true);
    });

    it('toggles isOpen from true to false', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue({ ...mockStore, isOpen: true });
      mockPrisma.store.update.mockResolvedValue({ ...mockStore, isOpen: false });

      const result = await service.toggleOpen('store-1', mockUser);

      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { id: 'store-1' },
        data: { isOpen: false },
      });
      expect(result.data.isOpen).toBe(false);
    });

    it('throws ForbiddenException when user is not the owner', async () => {
      mockPrisma.store.findUniqueOrThrow.mockResolvedValue(mockStore);
      const otherUser = { id: 'user-2', email: 'other@test.com', role: 'SELLER' as const };

      await expect(service.toggleOpen('store-1', otherUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
