/* eslint-disable no-console */
import app from './app';
import { config } from './config/env';
import { testConnection, close as closeDb } from './database/connection';
import { redisClientInstance } from './database/redis';

const startServer = async () => {
  try {
    // Test database connection
    await testConnection();

    // Ensure Redis is connected
    await redisClientInstance.ensureConnected();

    // Start server
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(
        `🏥 Health check: http://localhost:${config.port}/api/v1/health`
      );
      console.log(`📝 API docs: http://localhost:${config.port}/api/v1/docs`);
      console.log(process.env.CORS_ALLOWED_ORIGINS?.split(','));
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        console.log('Process terminated');
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
