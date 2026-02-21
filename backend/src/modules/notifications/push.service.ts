import { Injectable } from '@nestjs/common';
import Expo, { ExpoPushMessage } from 'expo-server-sdk';

@Injectable()
export class PushService {
  private expo = new Expo();

  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, any>,
  ) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.warn(`Invalid Expo push token: ${pushToken}`);
      return;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    try {
      const chunks = this.expo.chunkPushNotifications([message]);
      for (const chunk of chunks) {
        await this.expo.sendPushNotificationsAsync(chunk);
      }
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }
}
