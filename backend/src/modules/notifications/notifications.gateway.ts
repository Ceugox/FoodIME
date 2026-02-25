import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@Injectable()
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'] },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token as string | undefined;
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwtService.verify(token);
      (client as any).user = payload;
      this.logger.log(`Client connected: ${client.id} (user: ${payload.id})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-seller-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sellerId: string },
  ) {
    const user = (client as any).user;
    if (!user || user.id !== data.sellerId) {
      return { error: 'Acesso negado' };
    }
    const room = `seller-${data.sellerId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room ${room}`);
  }

  @SubscribeMessage('leave-seller-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sellerId: string },
  ) {
    const room = `seller-${data.sellerId}`;
    client.leave(room);
  }

  notifyNewOrder(sellerId: string, order: any) {
    const room = `seller-${sellerId}`;
    this.server.to(room).emit('new-order', order);
  }

  notifyOrderUpdate(sellerId: string, order: any) {
    this.server.to(`seller-${sellerId}`).emit('order-updated', order);
  }
}
