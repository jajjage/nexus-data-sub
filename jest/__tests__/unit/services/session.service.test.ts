import {
  SessionService,
  UserAgentInfo,
} from '../../../../src/services/session.service';
// import { redisClientInstance } from '../../../../src/database/redis';
import { generateSecureToken } from '../../../../src/utils/crypto';

describe('SessionService', () => {
  const sessionId = generateSecureToken();
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
  const mockRefreshToken = 'test-refresh-token';
  const mockUserAgent: UserAgentInfo = {
    timestamp: '',
    type: 'Desktop',
    browser: '',
    os: '',
    device: '',
    rawUserAgent: '',
    parsed: undefined,
  };
  const mockIp = '127.0.0.1';
  const mockSessionId = sessionId;

  describe('createSession', () => {
    it('should create a new session', async () => {
      const session = await SessionService.createSession(
        mockSessionId,
        mockUserId,
        mockRefreshToken,
        mockUserAgent,
        mockIp
      );

      expect(session).toBeDefined();
      expect(session.userId).toBe(mockUserId);
      expect(session.refreshToken).toBe(mockRefreshToken);
      expect(session.userAgent).toBe(mockUserAgent);
      expect(session.ip).toBe(mockIp);
      expect(session.id).toBeDefined();
    });

    describe('getSession', () => {
      it('should retrieve an existing session', async () => {
        const retrievedSession = await SessionService.getSession(mockSessionId);

        expect(retrievedSession).toBeDefined();
        expect(retrievedSession?.id).toBe(mockSessionId);
        expect(retrievedSession?.userId).toBe(mockUserId);
      });

      it('should return null for non-existent session', async () => {
        const nonExistentId = 'non-existent-id';

        const session = await SessionService.getSession(nonExistentId);
        expect(session).toBeNull();
      });
    });

    describe('getSessionByRefreshToken', () => {
      it('should retrieve session by refresh token', async () => {
        const retrievedSession =
          await SessionService.getSessionByRefreshToken(mockRefreshToken);

        expect(retrievedSession).toBeDefined();
        expect(retrievedSession?.id).toBe(mockSessionId);
        expect(retrievedSession?.refreshToken).toBe(mockRefreshToken);
      });

      it('should return null for invalid refresh token', async () => {
        const invalidRefreshToken = 'invalid-token';

        const session =
          await SessionService.getSessionByRefreshToken(invalidRefreshToken);
        expect(session).toBeNull();
      });
    });

    describe('deleteSession', () => {
      it('should delete an existing session', async () => {
        const result = await SessionService.deleteSession(mockSessionId);
        expect(result).toBe(true);
      });

      it('should return false for non-existent session', async () => {
        const nonExistentId = 'non-existent-id';

        const result = await SessionService.deleteSession(nonExistentId);
        expect(result).toBe(false);
      });
    });

    describe('deleteAllUserSessions', () => {
      it('should delete all sessions for a user', async () => {
        const session = await SessionService.createSession(
          mockSessionId,
          mockUserId,
          mockRefreshToken,
          mockUserAgent,
          mockIp
        );

        expect(session).toBeDefined();
        expect(session.userId).toBe(mockUserId);
        expect(session.refreshToken).toBe(mockRefreshToken);
        expect(session.userAgent).toBe(mockUserAgent);
        expect(session.ip).toBe(mockIp);
        expect(session.id).toBeDefined();

        const deletedCount =
          await SessionService.deleteAllUserSessions(mockUserId);
        expect(deletedCount).toBe(1);

        const sessions = await SessionService.getUserSessions(mockUserId);
        expect(sessions.length).toBe(0);
      });

      it('should return 0 if user has no sessions', async () => {
        const deletedCount =
          await SessionService.deleteAllUserSessions(mockUserId);
        expect(deletedCount).toBe(0);
      });
    });

    describe('getUserSessions', () => {
      it('should return all sessions for a user', async () => {
        const session = await SessionService.createSession(
          mockSessionId,
          mockUserId,
          mockRefreshToken,
          mockUserAgent,
          mockIp
        );

        expect(session).toBeDefined();
        expect(session.userId).toBe(mockUserId);
        expect(session.refreshToken).toBe(mockRefreshToken);
        expect(session.userAgent).toBe(mockUserAgent);
        expect(session.ip).toBe(mockIp);
        expect(session.id).toBeDefined();

        const sessions = await SessionService.getUserSessions(mockUserId);

        expect(sessions).toHaveLength(1);
        expect(sessions[0].id).toBe(mockSessionId);
      });
    });
  });
});
