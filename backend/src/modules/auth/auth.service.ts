import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
} from '../../common/constants';
import { UserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        role: dto.role,
      },
    });

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        ...tokens,
      },
    };
  }

  async refresh(userPayload: UserPayload, rawToken?: string) {
    if (rawToken) {
      const stored = await this.prisma.refreshToken.findFirst({
        where: {
          token: rawToken,
          userId: userPayload.id,
          expiresAt: { gt: new Date() },
        },
      });
      if (!stored) {
        throw new UnauthorizedException('Refresh token inválido ou expirado');
      }
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userPayload.id },
    });

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return { data: tokens };
  }

  async updatePushToken(userId: string, pushToken: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
    return { message: 'Push token atualizado' };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.deleteMany({
        where: { userId, token: refreshToken },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({ where: { userId } });
    }
    return { message: 'Logout realizado com sucesso' };
  }

  async getProfile(userPayload: UserPayload) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userPayload.id },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true },
    });

    return { data: user };
  }

  private async generateTokens(payload: UserPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_SECRET,
        expiresIn: JWT_ACCESS_EXPIRY,
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: JWT_REFRESH_EXPIRY,
      }),
    ]);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.prisma.refreshToken.create({
      data: { token: refreshToken, userId: payload.id, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
