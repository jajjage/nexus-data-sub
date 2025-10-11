import { JwtService } from '../../../../src/services/jwt.service';

describe('JwtService', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        permissions: ['read:users', 'write:users'],
        sessionId: 'dfaafe',
        aud: 'jajjage',
      };

      const { accessToken, refreshToken } =
        JwtService.generateTokenPair(payload);
      console.log('generateToken', accessToken, refreshToken);
      expect(accessToken).toBeDefined();
      expect(typeof accessToken).toBe('string');
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const payload = {
        userId: '123',
        email: 'test@example.com',
        role: 'admin',
        aud: 'jajjage',
      };

      const { accessToken, refreshToken } =
        JwtService.generateTokenPair(payload);
      console.log('verifyToken', accessToken, refreshToken);
      const decoded = JwtService.verifyToken(accessToken);

      expect(decoded).toBeDefined();
      if (!decoded) {
        throw new Error('Token verification failed');
      }
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded?.email).toBe(payload.email);
      // expect(decoded?.role).toBe(payload.role);
    });

    it('should return null for invalid token', () => {
      const decoded = JwtService.verifyToken('invalid.token.here');
      expect(decoded).toBeNull();
    });
  });
});
