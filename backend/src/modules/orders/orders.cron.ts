import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';

@Injectable()
export class OrdersCron {
  private readonly logger = new Logger(OrdersCron.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanupExpiredOrders() {
    const count = await this.ordersService.cleanupExpiredOrders();
    if (count > 0) {
      this.logger.log(`Cron: cleaned up ${count} expired orders`);
    }
  }
}
