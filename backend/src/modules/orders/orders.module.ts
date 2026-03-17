import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersCron } from './orders.cron';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersCron],
  exports: [OrdersService],
})
export class OrdersModule {}
