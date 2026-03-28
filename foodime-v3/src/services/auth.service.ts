import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '@/lib/prisma';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/email';
import { AppError } from '@/lib/api/errors';
import type { UserPayload } from '@/lib/jwt';
import type {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ResendVerificationInput,
  GoogleAuthInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@/schemas/auth';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function generateTokens(payload: UserPayload) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(payload),
    signRefreshToken(payload),
  ]);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: payload.id, expiresAt },
  });

  return { accessToken, refreshToken };
}

export async function register(dto: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new AppError(409, 'Email já cadastrado');

  const hashedPassword = await bcrypt.hash(dto.password, 10);
  const verificationToken = randomUUID();
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.create({
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

  await sendVerificationEmail(dto.email, verificationToken);

  return { message: 'Verifique seu email para ativar sua conta' };
}

export async function login(dto: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });

  if (!user || !user.password) throw new AppError(401, 'Credenciais inválidas');

  const valid = await bcrypt.compare(dto.password, user.password);
  if (!valid) throw new AppError(401, 'Credenciais inválidas');

  if (!user.emailVerified) {
    throw new AppError(401, 'Email não verificado. Verifique sua caixa de entrada.');
  }

  if (user.status === 'BLOCKED') throw new AppError(403, 'Sua conta foi bloqueada.');

  if (user.status === 'PENDING' && user.role === 'SELLER') {
    throw new AppError(403, 'Sua conta está aguardando aprovação do administrador.');
  }

  if (user.status === 'PENDING' && user.role === 'BUYER') {
    await prisma.user.update({ where: { id: user.id }, data: { status: 'ACTIVE' } });
  }

  const tokens = await generateTokens({ id: user.id, email: user.email, role: user.role });

  return {
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    },
  };
}

export async function verifyEmail(dto: VerifyEmailInput) {
  const user = await prisma.user.findUnique({
    where: { emailVerificationToken: dto.token },
  });

  if (!user) throw new AppError(400, 'Token de verificação inválido.');

  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    throw new AppError(400, 'Token de verificação expirado. Solicite um novo.');
  }

  const newStatus = user.role === 'BUYER' ? 'ACTIVE' : 'PENDING';

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      status: newStatus,
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

export async function resendVerification(dto: ResendVerificationInput) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  const genericMessage = 'Se o email existir, um novo link de verificação será enviado.';

  if (!user) return { message: genericMessage };
  if (user.emailVerified) return { message: 'Email já verificado.' };

  const verificationToken = randomUUID();
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerificationToken: verificationToken, emailVerificationExpiry: verificationExpiry },
  });

  await sendVerificationEmail(user.email, verificationToken);

  return { message: genericMessage };
}

export async function googleAuth(dto: GoogleAuthInput) {
  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch {
    throw new AppError(401, 'Token Google inválido.');
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.email) throw new AppError(401, 'Token Google inválido.');

  const { email, name, sub: googleId } = payload;

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, emailVerified: true },
      });
    }

    if (user.status === 'BLOCKED') throw new AppError(403, 'Sua conta foi bloqueada.');

    if (user.status === 'PENDING' && user.role === 'SELLER') {
      throw new AppError(403, 'Sua conta está aguardando aprovação do administrador.');
    }

    if (user.status === 'PENDING' && user.role === 'BUYER') {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE' },
      });
    }
  } else {
    const role = dto.role || 'BUYER';
    const status = role === 'BUYER' ? 'ACTIVE' : 'PENDING';

    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        phone: null,
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

  const tokens = await generateTokens({ id: user.id, email: user.email, role: user.role });

  return {
    data: {
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      ...tokens,
    },
  };
}

export async function refresh(userPayload: UserPayload, rawToken: string) {
  const stored = await prisma.refreshToken.findFirst({
    where: { token: rawToken, userId: userPayload.id, expiresAt: { gt: new Date() } },
  });
  if (!stored) throw new AppError(401, 'Refresh token inválido ou expirado');

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userPayload.id } });

  const tokens = await generateTokens({ id: user.id, email: user.email, role: user.role });

  return { data: tokens };
}

export async function forgotPassword(dto: ForgotPasswordInput) {
  const user = await prisma.user.findUnique({ where: { email: dto.email } });
  const genericMessage = 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.';

  if (!user || !user.password) return { message: genericMessage };

  const resetToken = randomUUID();
  const resetExpiry = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
  });

  // Fire-and-forget
  sendPasswordResetEmail(user.email, resetToken);

  return { message: genericMessage };
}

export async function resetPassword(dto: ResetPasswordInput) {
  const user = await prisma.user.findUnique({
    where: { passwordResetToken: dto.token },
  });

  if (!user) throw new AppError(400, 'Token de redefinição inválido.');

  if (user.passwordResetExpiry && user.passwordResetExpiry < new Date()) {
    throw new AppError(400, 'Token de redefinição expirado. Solicite um novo.');
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, passwordResetToken: null, passwordResetExpiry: null },
  });

  return { message: 'Senha redefinida com sucesso!' };
}

export async function logout(userId: string, refreshTokenValue?: string) {
  if (refreshTokenValue) {
    await prisma.refreshToken.deleteMany({ where: { userId, token: refreshTokenValue } });
  } else {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  }
  return { message: 'Logout realizado com sucesso' };
}

export async function getProfile(userPayload: UserPayload) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userPayload.id },
    select: {
      id: true, name: true, email: true, phone: true,
      role: true, status: true, emailVerified: true, createdAt: true,
    },
  });

  return { data: user };
}
