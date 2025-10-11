import db from '../../../../src/database/connection';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

describe('UserModel', () => {
  // The global setup in jest/setup.ts handles truncating tables, including 'users' and 'roles'.
  // It also seeds the initial roles, so we don't need to insert them here.

  describe('create', () => {
    it('should create a new user with the correct role and return the user data', async () => {
      // Arrange
      const userData: CreateUserInput = {
        email: 'test.create@example.com',
        password: 'Password123!',
        role: 'reporter',
      };

      // Act
      const user = await UserModel.create(userData);

      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe('reporter');
      expect(user.isVerified).toBe(false);
      expect(user.verificationToken).toBeDefined();

      // Verify the user was actually inserted into the database
      const dbUser = await db('users').where({ email: userData.email }).first();
      expect(dbUser).toBeDefined();
      expect(dbUser.id).toBe(user.userId);
    });
  });

  describe('findByEmail', () => {
    it('should find an existing user by email', async () => {
      // Arrange
      const userData: CreateUserInput = {
        email: 'test.find@example.com',
        password: 'Password123!',
        role: 'staff',
      };
      await UserModel.create(userData);

      // Act
      const user = await UserModel.findByEmail(userData.email);

      // Assert
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
      expect(user?.role).toBe('staff');
    });

    it('should be case-insensitive when finding a user by email', async () => {
      // Arrange
      const userData: CreateUserInput = {
        email: 'test.case@example.com',
        password: 'Password123!',
        role: 'admin',
      };
      await UserModel.create(userData);

      // Act
      const user = await UserModel.findByEmail('TEST.CASE@EXAMPLE.COM');

      // Assert
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
    });

    it('should return null for a non-existent user', async () => {
      // Act
      const user = await UserModel.findByEmail('nonexistent@example.com');

      // Assert
      expect(user).toBeNull();
    });
  });
});
