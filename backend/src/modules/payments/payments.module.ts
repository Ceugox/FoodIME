import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { WebhookController } from './webhook.controller';
import { PaymentsService } from './payments.service';
import { MercadoPagoService } from './mercadopago.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [PaymentsController, WebhookController],
  providers: [PaymentsService, MercadoPagoService],
  exports: [PaymentsService, MercadoPagoService],
})
export class PaymentsModule {}
