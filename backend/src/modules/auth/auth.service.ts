import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  JWT_ACCESS_EXPIRY,
  JWT_REFRESH_EXPIRY,
} from '../../common/constants';
import { UserPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    this.googleClient = new OAuth2Client(googleClientId);
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const verificationToken = uuidv4();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone,
        role: dto.role,
        status: 'PENDING',
        emailVerified: false,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    await this.emailService.sendVerificationEmail(dto.email, verificationToken);

    return { message: 'Verifique seu email para ativar sua conta' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Email não verificado. Verifique sua caixa de entrada.');
    }

    if (user.status === 'BLOCKED') {
      throw new ForbiddenException('Sua conta foi bloqueada.');
    }

    if (user.status === 'PENDING' && user.role === 'SELLER') {
      throw new ForbiddenException('Sua conta está aguardando aprovação do administrador.');
    }

    if (user.status === 'PENDING' && user.role === 'BUYER') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE' },
      });
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

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({
      where: { emailVerificationToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Token de verificação inválido.');
    }

    if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
      throw new BadRequestException('Token de verificação expirado. Solicite um novo.');
    }

    const newStatus = user.role === 'BUYER' ? 'ACTIVE' : 'PENDING';

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        status: newStatus as any,
      },
    });

    return {
      data: {
        role: user.role,
        status: newStatus,
        message:
          user.role === 'BUYER'
            ? 'Email verificado com sucesso!'
            : 'Email verificado! Aguarde a aprovação do administrador.',
      },
    };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return { message: 'Se o email existir, um novo link de verificação será enviado.' };
    }

    if (user.emailVerified) {
      return { message: 'Email já verificado.' };
    }

    const verificationToken = uuidv4();
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    await this.emailService.sendVerificationEmail(user.email, verificationToken);

    return { message: 'Se o email existir, um novo link de verificação será enviado.' };
  }

  async googleAuth(dto: GoogleAuthDto) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    }).catch(() => {
      throw new UnauthorizedException('Token Google inválido.');
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Token Google inválido.');
    }

    const { email, name, sub: googleId } = payload;

    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (user) {
      if (!user.googleId) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId, emailVerified: true },
        });
      }

      if (user.status === 'BLOCKED') {
        throw new ForbiddenException('Sua conta foi bloqueada.');
      }

      if (user.status === 'PENDING' && user.role === 'SELLER') {
        throw new ForbiddenException('Sua conta está aguardando aprovação do administrador.');
      }

      if (user.status === 'PENDING' && user.role === 'BUYER') {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { status: 'ACTIVE' },
        });
      }
    } else {
      const role = dto.role || 'BUYER';
      const status = role === 'BUYER' ? 'ACTIVE' : 'PENDING';

      user = await this.prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          phone: '',
          googleId,
          role,
          status,
          emailVerified: true,
        },
      });

      if (role === 'SELLER') {
        return {
          data: {
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
            message: 'Conta criada! Aguarde a aprovação do administrador.',
            needsApproval: true,
          },
        };
      }
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

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Always return generic message to prevent email enumeration
    const genericMessage = 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.';

    if (!user || !user.password) {
      // User doesn't exist or is Google-only (no password to reset)
      return { message: genericMessage };
    }

    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    // Fire-and-forget — don't block the response
    this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: genericMessage };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { passwordResetToken: dto.token },
    });

    if (!user) {
      throw new BadRequestException('Token de redefinição inválido.');
    }

    if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Token de redefinição expirado. Solicite um novo.');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return { message: 'Senha redefinida com sucesso!' };
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
      select: { id: true, name: true, email: true, phone: true, role: true, status: true, emailVerified: true, createdAt: true },
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
