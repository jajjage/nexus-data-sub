// src/config/websocket.config.ts

export const websocketConfig = {
  maxConnections: 120, // 20% buffer over max users
  heartbeatInterval: 30000, // 30 seconds
  reconnectAttempts: 3,
  connectionTimeout: 5000, // 5 seconds
};
