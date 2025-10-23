import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import {
  AuthenticatedSocket,
  verifySocketMiddleware,
} from './middleware/socket.middleware';

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(verifySocketMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log('a user connected:', socket.id);

    if (socket.user) {
      // Join a room based on user ID for personal notifications
      socket.join(socket.user.userId);
    }

    socket.on('joinChannel', (channelId: string) => {
      socket.join(channelId);
      console.log(`Socket ${socket.id} joined channel ${channelId}`);
    });

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.id);
    });
  });

  return io;
};
