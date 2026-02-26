import { Body, Controller, Get, Headers, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { UserPayload } from '../../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-verification')
  @Throttle({ default: { ttl: 60000, limit: 3 } })
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @Post('google')
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  googleAuth(@Body() dto: GoogleAuthDto) {
    return this.authService.googleAuth(dto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  refresh(
    @CurrentUser() user: UserPayload,
    @Headers('authorization') auth: string,
  ) {
    const rawToken = auth?.replace('Bearer ', '');
    return this.authService.refresh(user, rawToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserPayload) {
    return this.authService.getProfile(user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  logout(
    @CurrentUser() user: UserPayload,
    @Body() body: { refreshToken?: string },
  ) {
    return this.authService.logout(user.id, body.refreshToken);
  }

  @Patch('push-token')
  @UseGuards(JwtAuthGuard)
  updatePushToken(
    @CurrentUser() user: UserPayload,
    @Body('pushToken') pushToken: string,
  ) {
    return this.authService.updatePushToken(user.id, pushToken);
  }
}
