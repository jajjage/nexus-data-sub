import db from '../../../../src/database/connection';
import { NotificationModel } from '../../../../src/models/Notification';
import { NotificationAnalyticsModel } from '../../../../src/models/NotificationAnalytics';
import { CreateUserInput, UserModel } from '../../../../src/models/User';

describe('NotificationAnalyticsModel', () => {
  let testUser: any;
  let testNotification: any;

  beforeAll(async () => {
    // Create a user for testing
    const userData: CreateUserInput = {
      email: 'analytics.user@example.com',
      fullName: 'Analytics User',
      phoneNumber: '1234567890',
      password: 'Password123!',
      role: 'user',
    };
    const createdUser = await UserModel.create(userData);
    testUser = await UserModel.findForAuth(createdUser.email);

    // Create a notification for testing
    testNotification = await NotificationModel.create(
      {
        title: 'Analytics Test Notification',
        body: 'This is a test notification for analytics',
      },
      testUser.userId
    );
  });

  afterAll(async () => {
    // Clean up test data
    if (testNotification?.id) {
      await db('notification_analytics')
        .where({ notification_id: testNotification.id })
        .del();
    }
    if (testUser?.userId) {
      await db('notifications').where({ created_by: testUser.userId }).del();
      await db('users').where({ id: testUser.userId }).del();
    }
  });

  afterEach(async () => {
    await db('notification_analytics').del();
  });

  describe('create', () => {
    it('should create a new notification analytics record', async () => {
      const analyticsData = {
        notification_id: testNotification.id,
        user_id: testUser.userId,
        status: 'sent' as const,
      };
      const analytics = await NotificationAnalyticsModel.create(analyticsData);
      expect(analytics).toBeDefined();
      expect(analytics.status).toBe('sent');
    });
  });

  describe('findByNotificationId', () => {
    it('should find all analytics records for a notification', async () => {
      await NotificationAnalyticsModel.create({
        notification_id: testNotification.id,
        user_id: testUser.userId,
        status: 'sent',
      });
      const analytics = await NotificationAnalyticsModel.findByNotificationId(
        testNotification.id
      );
      expect(analytics).toHaveLength(1);
    });
  });

  describe('findByUserId', () => {
    it('should find all analytics records for a user', async () => {
      await NotificationAnalyticsModel.create({
        notification_id: testNotification.id,
        user_id: testUser.userId,
        status: 'sent',
      });
      const analytics = await NotificationAnalyticsModel.findByUserId(
        testUser.userId
      );
      expect(analytics).toHaveLength(1);
    });
  });
});
