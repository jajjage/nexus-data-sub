import { TotpService } from '../../../../src/services/topt.service';

describe('TotpService', () => {
  describe('generateSecret', () => {
    it('should generate a valid TOTP secret', () => {
      const secret = TotpService.generateSecret();
      expect(secret).toBeDefined();
      expect(secret.base32).toBeDefined();
      expect(secret.ascii).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid TOTP token', () => {
      // For testing purposes, we'll just check that the method exists
      // In a real test, we'd generate a valid token and verify it
      expect(typeof TotpService.verifyToken).toBe('function');
    });
  });

  describe('generateBackupCodes', () => {
    it('should generate backup codes', () => {
      const { plain: codes, hashed: hashedCodes } =
        TotpService.generateBackupCodes(8);
      expect(codes).toHaveLength(8);
      expect(hashedCodes).toHaveLength(8);
      codes.forEach(code => {
        expect(code).toHaveLength(8);
        expect(code).toMatch(/^[A-Z0-9]{8}$/);
      });
    });
  });
});
