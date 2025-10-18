import db from '../../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

describe('UserModel', () => {
  let testUser: any;

  beforeEach(async () => {
    await db.transaction(async trx => {
      // Create a user that can be used by multiple tests
      const userData: CreateUserInput = {
        email: 'test.user@example.com',
        fullName: 'Test User',
        phoneNumber: '1234567890',
        password: 'Password123!',
        role: 'user',
      };
      testUser = await UserModel.create(userData, trx);
    });
  });

  afterEach(async () => {
    await db.transaction(async trx => {
      // Clean up the created user
      if (testUser && testUser.userId) {
        await trx('users').where({ id: testUser.userId }).del();
      }
    });
  });

  describe('findProfileById', () => {
    it('should find a user by ID and return their public profile', async () => {
      const profile = await UserModel.findProfileById(testUser.userId);

      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(testUser.userId);
      expect(profile?.email).toBe(testUser.email);
      expect(profile?.fullName).toBe(testUser.fullName);
      // Ensure sensitive data is NOT present
      expect(profile).not.toHaveProperty('password');
      expect(profile).not.toHaveProperty('twoFactorSecret');
    });

    it('should return null if no user is found', async () => {
      const profile = await UserModel.findProfileById(
        '00000000-0000-0000-0000-000000000000'
      );
      expect(profile).toBeNull();
    });
  });

  describe('findForAuth', () => {
    it('should find a user by email for authentication', async () => {
      const authPayload = await UserModel.findForAuth(testUser.email);

      expect(authPayload).toBeDefined();
      expect(authPayload?.userId).toBe(testUser.userId);
      expect(authPayload).toHaveProperty('password'); // Password hash should be present
      expect(authPayload?.permissions).toBeInstanceOf(Array);
    });

    it('should find a user by phone number for authentication', async () => {
      const authPayload = await UserModel.findForAuth(testUser.phoneNumber);

      expect(authPayload).toBeDefined();
      expect(authPayload?.userId).toBe(testUser.userId);
      expect(authPayload?.email).toBe(testUser.email);
    });

    it('should be case-insensitive for email', async () => {
      const authPayload = await UserModel.findForAuth('TEST.USER@EXAMPLE.COM');
      expect(authPayload).toBeDefined();
      expect(authPayload?.userId).toBe(testUser.userId);
    });

    it('should return null for a non-existent user', async () => {
      const authPayload = await UserModel.findForAuth('not.exist@example.com');
      expect(authPayload).toBeNull();
    });
  });

  describe('getPermissions', () => {
    it("should retrieve the correct permissions for a user's role", async () => {
      const userRole = await db('roles').where({ name: 'user' }).first();
      const permissions = await UserModel.getPermissions(userRole.id);

      expect(permissions).toBeInstanceOf(Array);
      expect(permissions).toContain('profile.read');
      expect(permissions).toContain('profile.update');
      expect(permissions).not.toContain('system.settings'); // Admin permission
    });
  });
});
