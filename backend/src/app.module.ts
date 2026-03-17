import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import * as Joi from 'joi';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { StoresModule } from './modules/stores/stores.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SupabaseModule } from './supabase/supabase.module';
import { EmailModule } from './modules/email/email.module';
import { HealthModule } from './modules/health/health.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { AuditModule } from './modules/audit/audit.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required().min(32),
        JWT_REFRESH_SECRET: Joi.string().required().min(32),
        MERCADOPAGO_ACCESS_TOKEN: Joi.string().required(),
        MERCADOPAGO_WEBHOOK_SECRET: Joi.string().required(),
        GMAIL_USER: Joi.string().optional(),
        GMAIL_APP_PASSWORD: Joi.string().optional(),
        DIRECT_URL: Joi.string().optional(),
        FRONTEND_URL: Joi.string().default('http://localhost:3001'),
        GOOGLE_CLIENT_ID: Joi.string().optional(),
        CORS_ORIGINS: Joi.string().default('http://localhost:3001'),
        NODE_ENV: Joi.string()
          .valid('development', 'staging', 'production')
          .default('development'),
      }),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),
    PrismaModule,
    SupabaseModule,
    EmailModule,
    AuthModule,
    StoresModule,
    ProductsModule,
    OrdersModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
    UploadsModule,
    HealthModule,
    CouponsModule,
    AuditModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // SentryGlobalFilter must be first — captures exceptions before other filters transform them
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}
