import http from 'http';
import app from './app';
import { config } from './config/env';
import { close as closeDb, testConnection } from './database/connection';
import { redisClientInstance } from './database/redis';
import { initChatService } from './services/chat.service';
import { initSocket } from './socket';
import { logger } from './utils/logger.utils';

const server = http.createServer(app);
const io = initSocket(server);
initChatService(io);

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Ensure Redis is connected
    await redisClientInstance.ensureConnected();

    // Start server
    server.listen(config.port, '0.0.0.0', () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(
        `🏥 Health check: http://localhost:${config.port}/api/v1/health`
      );
      logger.info(`📝 API docs: http://localhost:${config.port}/api/v1/docs`);
      logger.info(
        `🔒 CORS allowed origins: ${process.env.CORS_ALLOWED_ORIGINS?.split(',').join(', ') || 'none'}`
      );
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        logger.info('Process terminated');
        await closeDb();
        await redisClientInstance.disconnect();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await closeDb();
    await redisClientInstance.disconnect();
    process.exit(1);
  }
};

startServer();

export default server;
