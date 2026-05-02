/**
 * Socket.IO gateway — real-time push to vendors / admins.
 *  - One room per user:    `user:<user_id>`
 *  - One room per store:   `store:<store_id>`
 *  - One global room:      `admin`
 *
 * Authentication is via the JWT access token passed as a `auth.token`
 * field at handshake time.
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'node:http';
import { verifyAccessToken } from '../utils/jwt';
import { logger } from '../utils/logger';
import { config } from '../config';
import { UserRole } from '@pandamarket/types';

class SocketGateway {
  private io: SocketIOServer | null = null;

  attach(server: HttpServer): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: [...config.adminCors, ...config.storeCors],
        credentials: true,
      },
      path: '/socket.io',
    });

    this.io.use((socket, next) => {
      try {
        const token =
          (socket.handshake.auth?.token as string | undefined) ??
          (socket.handshake.headers.authorization?.replace(/^Bearer\s+/, '') as
            | string
            | undefined);
        if (!token) return next(new Error('Missing auth token'));
        const payload = verifyAccessToken(token);
        socket.data.user_id = payload.sub;
        socket.data.role = payload.role;
        socket.data.store_id = payload.store_id;
        next();
      } catch (err) {
        next(err as Error);
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.user_id as string;
      const storeId = socket.data.store_id as string | null;
      const role = socket.data.role as UserRole;

      socket.join(`user:${userId}`);
      if (storeId) socket.join(`store:${storeId}`);
      if (role === UserRole.Admin || role === UserRole.SuperAdmin) socket.join('admin');

      logger.debug({ user_id: userId, role }, 'Socket connected');

      socket.on('disconnect', () => {
        logger.debug({ user_id: userId }, 'Socket disconnected');
      });
    });

    logger.info('Socket.IO attached');
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.io?.to(`user:${userId}`).emit(event, payload);
  }

  emitToStore(storeId: string, event: string, payload: unknown): void {
    this.io?.to(`store:${storeId}`).emit(event, payload);
  }

  emitToAdmins(event: string, payload: unknown): void {
    this.io?.to('admin').emit(event, payload);
  }
}

export const socketGateway = new SocketGateway();
