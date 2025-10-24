import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { websocketConfig } from './config/websocket.config';
import {
  AuthenticatedSocket,
  verifySocketMiddleware,
} from './middleware/socket.middleware';
import { ChatService } from './services/chat.service';
import { CreateMessageInput } from './types/chat.types';
import { logger } from './utils/logger.utils';

let connectedClients = 0;

const messageRateLimit = 60; // messages per minute
const joinRateLimit = 20; // joins per hour

const userMessageTimestamps: { [userId: string]: number[] } = {};
const userJoinTimestamps: { [userId: string]: number[] } = {};

export const initSocket = (server: HttpServer) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
    },
    connectTimeout: websocketConfig.connectionTimeout,
    pingInterval: websocketConfig.heartbeatInterval,
    pingTimeout: websocketConfig.heartbeatInterval / 2,
  });

  io.use(verifySocketMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    if (connectedClients >= websocketConfig.maxConnections) {
      logger.warn('Max connections reached. Disconnecting new client.');
      socket.disconnect(true);
      return;
    }
    connectedClients++;
    logger.info(
      `A user connected: ${socket.id}. Total clients: ${connectedClients}`
    );

    if (socket.user) {
      // Join a room based on user ID for personal notifications
      socket.join(socket.user.userId);
    }

    socket.on(
      'joinChannel',
      (channelId: string, callback: (res: any) => void) => {
        const userId = socket.user?.userId;
        if (!userId) return;

        const now = Date.now();
        const timestamps = userJoinTimestamps[userId] || [];
        const relevantTimestamps = timestamps.filter(
          ts => now - ts < 60 * 60 * 1000
        );

        if (relevantTimestamps.length >= joinRateLimit) {
          return callback({
            error: 'Too many channels joined, please try again later.',
          });
        }

        userJoinTimestamps[userId] = [...relevantTimestamps, now];

        socket.join(channelId);
        logger.info(`Socket ${socket.id} joined channel ${channelId}`);
        callback({ success: true });
      }
    );

    socket.on(
      'sendMessage',
      async (messageData: CreateMessageInput, callback: (res: any) => void) => {
        const userId = socket.user?.userId;
        if (!userId) return;

        const now = Date.now();
        const timestamps = userMessageTimestamps[userId] || [];
        const relevantTimestamps = timestamps.filter(
          ts => now - ts < 60 * 1000
        );

        if (relevantTimestamps.length >= messageRateLimit) {
          return callback({
            error: 'Too many messages sent, please try again later.',
          });
        }

        userMessageTimestamps[userId] = [...relevantTimestamps, now];

        try {
          const message = await ChatService.sendMessage({
            ...messageData,
            sender_id: userId,
          });
          callback({ success: true, message });
        } catch (error) {
          logger.error('Error sending message:', error);
          callback({ error: 'Failed to send message.' });
        }
      }
    );

    socket.on('disconnect', () => {
      connectedClients--;
      logger.info(
        `User disconnected: ${socket.id}. Total clients: ${connectedClients}`
      );
    });
  });

  return io;
};
