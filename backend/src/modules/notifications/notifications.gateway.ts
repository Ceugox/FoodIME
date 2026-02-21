import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-seller-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sellerId: string },
  ) {
    const room = `seller-${data.sellerId}`;
    client.join(room);
    console.log(`Client ${client.id} joined room ${room}`);
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
