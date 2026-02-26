import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';

// Mock bcrypt at module level — avoids Object.defineProperty issues with spyOn
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-1',
  name: 'João Silva',
  email: 'joao@test.com',
  password: '$2b$10$hashedpassword',
  phone: '21999999999',
  role: 'BUYER' as const,
  pushToken: null,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const mockJwt = {
  signAsync: jest.fn().mockResolvedValue('mock-token'),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();

    // Default: refreshToken.create returns successfully
    mockPrisma.refreshToken.create.mockResolvedValue({ id: 'rt-1', token: 'mock-token' });
  });

  describe('register', () => {
    const dto = {
      name: 'João Silva',
      email: 'joao@test.com',
      password: 'senha1234',
      phone: '21999999999',
      role: 'BUYER' as const,
    };

    it('creates user and returns tokens when email is not taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register(dto);

      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.data).toHaveProperty('accessToken');
      expect(result.data).toHaveProperty('refreshToken');
      expect(result.data.user.email).toBe('joao@test.com');
    });

    it('throws ConflictException when email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto = { email: 'joao@test.com', password: 'senha1234' };

    it('returns tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result.data).toHaveProperty('accessToken');
      expect(result.data.user.email).toBe('joao@test.com');
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('deletes specific refresh token when provided', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-1', 'some-token');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', token: 'some-token' },
      });
      expect(result.message).toContain('Logout');
    });

    it('deletes all refresh tokens when no token provided', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.logout('user-1');

      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('updatePushToken', () => {
    it('updates push token for user', async () => {
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, pushToken: 'expo-token' });

      const result = await service.updatePushToken('user-1', 'expo-token');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { pushToken: 'expo-token' },
      });
      expect(result.message).toContain('Push token');
    });
  });
});
