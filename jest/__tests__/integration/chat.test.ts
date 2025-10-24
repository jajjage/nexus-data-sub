// Mock the config to lower the connection limit for the test
jest.mock('../../../src/config/websocket.config', () => ({
  websocketConfig: {
    ...jest.requireActual('../../../src/config/websocket.config')
      .websocketConfig,
    maxConnections: 2,
  },
}));

// Mock the socket authentication middleware
jest.mock('../../../src/middleware/socket.middleware', () => ({
  verifySocketMiddleware: (socket: any, next: (err?: Error) => void) => {
    if (socket.handshake.auth && socket.handshake.auth.token === 'test-token') {
      socket.user = { userId: 'test-user-id', email: 'test@example.com' };
      next();
    } else {
      next(new Error('Authentication error'));
    }
  },
}));

// Mock the chat service to avoid actual DB calls
jest.mock('../../../src/services/chat.service');

// Mock HTTP authenticate middleware and mobile auth controller
jest.mock('../../../src/middleware/auth.middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id' };
    next();
  },
  authenticateRefresh: (req: any, res: any, next: any) => {
    req.user = { userId: 'test-user-id' };
    next();
  },
}));

jest.mock('../../../src/controllers/mobileAuth.controller', () => ({
  MobileAuthController: {
    login: (req: any, res: any) => {
      res.json({ success: true, data: { accessToken: 'test-token' } });
    },
    refresh: (req: any, res: any) => {
      res.json({ success: true, data: { accessToken: 'new-test-token' } });
    },
  },
}));

import { Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { Server } from 'socket.io';
import io from 'socket.io-client';
import request from 'supertest';
import app from '../../../src/app';
import { ChatService } from '../../../src/services/chat.service';
import { initSocket } from '../../../src/socket';
// Use a simple test-side alias for the client socket type to avoid importing runtime values in tests
type ClientSocket = any;

describe('Chat Integration Tests', () => {
  let httpServer: HttpServer;
  let serverSocket: Server;
  let port: number;

  beforeAll(done => {
    httpServer = new HttpServer(app);
    serverSocket = initSocket(httpServer);
    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll(done => {
    serverSocket.close();
    httpServer.close(done);
  });

  describe('Socket Tests', () => {
    it('should limit concurrent connections', done => {
      const clients: ClientSocket[] = [];
      const maxConnections = 2;
      let disconnectCount = 0;

      const disconnectHandler = () => {
        disconnectCount++;
        if (disconnectCount === 1) {
          // When the server disconnects the extra client, ensure only `maxConnections`
          // clients remain connected according to the client socket `.connected` flag.
          const currentlyConnected = clients.filter(c => c.connected).length;
          expect(currentlyConnected).toBe(maxConnections);
          clients.forEach(c => c.disconnect());
          done();
        }
      };

      for (let i = 0; i < maxConnections + 1; i++) {
        const client = io(`http://localhost:${port}`, {
          reconnection: false,
          forceNew: true,
          auth: { token: 'test-token' },
        });
        clients.push(client);
        client.on('disconnect', disconnectHandler);
      }
    }, 10000);

    describe('Authenticated Socket Events', () => {
      let clientSocket: ClientSocket;

      beforeEach(done => {
        clientSocket = io(`http://localhost:${port}`, {
          reconnection: false,
          forceNew: true,
          auth: { token: 'test-token' },
        });
        clientSocket.on('connect', () => done());
      });

      afterEach(() => {
        if (clientSocket.connected) {
          clientSocket.disconnect();
        }
      });

      it('should rate limit sendMessage event', done => {
        const messageRateLimit = 60; // As defined in socket.ts
        let errorCount = 0;
        let responseCount = 0;

        // Mock the service layer function
        (ChatService.sendMessage as jest.Mock).mockResolvedValue({
          id: 'mock-message-id',
        });

        for (let i = 0; i < messageRateLimit + 5; i++) {
          clientSocket.emit(
            'sendMessage',
            { channel_id: 'test-channel', body: `message ${i}` },
            (res: any) => {
              responseCount++;
              if (res.error) {
                errorCount++;
              }
              if (responseCount === messageRateLimit + 5) {
                expect(errorCount).toBeGreaterThan(0);
                done();
              }
            }
          );
        }
      }, 15000);

      it('should rate limit joinChannel event', done => {
        const joinRateLimit = 20; // As defined in socket.ts
        let errorCount = 0;
        let responseCount = 0;

        for (let i = 0; i < joinRateLimit + 5; i++) {
          clientSocket.emit('joinChannel', `channel-${i}`, (res: any) => {
            responseCount++;
            if (res.error) {
              errorCount++;
            }
            if (responseCount === joinRateLimit + 5) {
              expect(errorCount).toBeGreaterThan(0);
              done();
            }
          });
        }
      }, 15000);
    });
  });

  describe('HTTP Rate Limiting', () => {
    // HTTP authenticate middleware is mocked at module import time above so
    // tests can run without patching the express router internals.

    it('should rate limit support channel creation', async () => {
      const agent = request(app);
      const channelCreationLimit = 5; // From channelCreationLimiter

      // Mock the service to prevent DB calls
      (ChatService.createSupportChannel as jest.Mock).mockResolvedValue({
        id: 'mock-channel-id',
      });

      for (let i = 0; i < channelCreationLimit; i++) {
        await agent.post('/api/v1/chat/support').expect(201);
      }

      const res = await agent.post('/api/v1/chat/support');
      expect(res.status).toBe(429);
      expect(res.text).toContain(
        'Too many channels created, please try again later.'
      );
    }, 10000);

    it('should rate limit getting messages', async () => {
      const agent = request(app);
      const messageRateLimit = 60; // From messageRateLimiter

      // Mock the service to prevent DB calls
      (ChatService.getMessages as jest.Mock).mockResolvedValue([]);

      for (let i = 0; i < messageRateLimit; i++) {
        await agent
          .get('/api/v1/chat/channels/test-channel/messages')
          .expect(200);
      }

      const res = await agent.get(
        '/api/v1/chat/channels/test-channel/messages'
      );
      expect(res.status).toBe(429);
      expect(res.text).toContain(
        'Too many messages sent, please try again later.'
      );
    }, 15000);
  });
});
