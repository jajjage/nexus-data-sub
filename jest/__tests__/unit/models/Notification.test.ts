import db from '../../../../src/database/connection';
import { NotificationModel } from '../../../../src/models/Notification';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

describe('NotificationModel', () => {
  let testUser: any;

  beforeAll(async () => {
    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'notification.user@example.com',
      fullName: 'Notification User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser?.userId) {
      await db('push_tokens').where({ user_id: testUser.userId }).del();
      await db('notifications').where({ created_by: testUser.userId }).del();
      await db('users').where({ id: testUser.userId }).del();
    }
  });

  afterEach(async () => {
    // Clear tables between tests
    await db('push_tokens').del();
    await db('notifications').del();
  });

  describe('create', () => {
    it('should create a new notification', async () => {
      const notificationData = {
        title: 'Test Notification',
        body: 'This is a test notification',
      };
      const notification = await NotificationModel.create(
        notificationData,
        testUser.userId
      );
      expect(notification).toBeDefined();
      expect(notification.title).toBe(notificationData.title);
      expect(notification.body).toBe(notificationData.body);
    });
  });

  describe('findAll', () => {
    it('should return all notifications', async () => {
      await NotificationModel.create(
        {
          title: 'Test Notification 1',
          body: 'Body 1',
        },
        testUser.userId
      );
      await NotificationModel.create(
        {
          title: 'Test Notification 2',
          body: 'Body 2',
        },
        testUser.userId
      );

      const notifications = await NotificationModel.findAll();
      expect(notifications).toHaveLength(2);
    });
  });

  describe('registerPushToken', () => {
    it('should register a new push token', async () => {
      const tokenData = {
        userId: testUser.userId,
        platform: 'web' as const,
        token: 'test-push-token',
      };
      await NotificationModel.registerPushToken(tokenData);
      const token = await db('push_tokens')
        .where({ user_id: testUser.userId, token: 'test-push-token' })
        .first();
      expect(token).toBeDefined();
    });
  });

  describe('findUserPushTokens', () => {
    it('should find all push tokens for a user', async () => {
      await NotificationModel.registerPushToken({
        userId: testUser.userId,
        platform: 'web',
        token: 'token1',
      });
      await NotificationModel.registerPushToken({
        userId: testUser.userId,
        platform: 'ios',
        token: 'token2',
      });

      const tokens = await NotificationModel.findUserPushTokens(
        testUser.userId
      );
      expect(tokens).toHaveLength(2);
    });
  });

  describe('findAllPushTokens', () => {
    it('should return all push tokens', async () => {
      await NotificationModel.registerPushToken({
        userId: testUser.userId,
        platform: 'web',
        token: 'token1',
      });
      const tokens = await NotificationModel.findAllPushTokens();
      expect(tokens.length).toBeGreaterThanOrEqual(1);
    });
  });
});
