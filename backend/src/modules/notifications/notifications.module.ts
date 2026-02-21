import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { PushService } from './push.service';

@Module({
  providers: [NotificationsGateway, PushService],
  exports: [NotificationsGateway, PushService],
})
export class NotificationsModule {}
