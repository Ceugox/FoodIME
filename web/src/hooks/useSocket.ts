'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export function useSocket() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'SELLER' || !accessToken) return;

    const socket = io(`${SOCKET_URL}/notifications`, {
      transports: ['websocket'],
      auth: { token: accessToken },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-seller-room', { sellerId: user.id });
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.warn('Socket disconnected:', reason);
    });

    socket.on('new-order', () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'seller'] });
    });

    socket.on('order-updated', () => {
      queryClient.invalidateQueries({ queryKey: ['orders', 'seller'] });
    });

    return () => {
      socket.emit('leave-seller-room', { sellerId: user.id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, accessToken, queryClient]);

  return socketRef.current;
}
