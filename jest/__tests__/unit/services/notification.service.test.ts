import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { config as envConfig } from '../../../../src/config/env';
import db from '../../../../src/database/connection';
import { NotificationModel } from '../../../../src/models/Notification';
import { FirebaseService } from '../../../../src/services/firebase.service';
import { NotificationService } from '../../../../src/services/notification.service';

jest.mock('../../../../src/models/Notification');

const mockRegister = jest.fn();
(NotificationModel as any).registerPushToken = mockRegister;

jest.mock('../../../../src/services/firebase.service', () => ({
  FirebaseService: {
    subscribeTokenToTopic: jest.fn(() => Promise.resolve()),
  },
}));

describe('NotificationService.registerPushToken', () => {
  let userId: string;
  let roleId: string;

  beforeAll(async () => {
    const userRole = await db('roles').where({ name: 'user' }).first();
    if (!userRole) {
      throw new Error('Role "user" not found. Please run seeds.');
    }
    roleId = userRole.id;
    userId = uuidv4();
    const hashedPassword = await bcrypt.hash('password123', 10);

    await db('users').insert({
      id: userId,
      email: 'test.user@notification.service.test',
      password: hashedPassword,
      role: 'user',
      role_id: roleId,
      is_verified: true,
    });
  });

  afterAll(async () => {
    await db('users').where({ id: userId }).del();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register token and subscribe to configured topics and role topic', async () => {
    // Arrange
    const tokenData = { userId: userId, token: 'tok-1', platform: 'web' };

    // Ensure config has expected topics for this test
    (envConfig.notifications.autoSubscribeTopics as any) = ['all', 'news'];
    (envConfig.notifications.subscribeRoleTopic as any) = true;

    // Act
    await NotificationService.registerPushToken(tokenData as any);

    // Assert
    expect(mockRegister).toHaveBeenCalledWith(tokenData);
    const subscribeMock = (FirebaseService as any)
      .subscribeTokenToTopic as jest.Mock;
    // Should be called for 'all', 'news', and 'role_user' with token as array
    expect(subscribeMock).toHaveBeenCalledWith(['tok-1'], 'all');
    expect(subscribeMock).toHaveBeenCalledWith(['tok-1'], 'news');
    expect(subscribeMock).toHaveBeenCalledWith(['tok-1'], 'role_user');
  });
});

describe('NotificationService - Delete & Mark As Read', () => {
  let userId: string;
  let notificationId: string;
  let roleId: string;

  beforeAll(async () => {
    const userRole = await db('roles').where({ name: 'user' }).first();
    if (!userRole) {
      throw new Error('Role "user" not found. Please run seeds.');
    }
    roleId = userRole.id;
    userId = uuidv4();
    notificationId = uuidv4();

    const hashedPassword = await bcrypt.hash('password123', 10);
    await db('users').insert({
      id: userId,
      email: 'test.notification@example.com',
      password: hashedPassword,
      role: 'user',
      role_id: roleId,
      is_verified: true,
    });

    // Create test notification
    await db('notifications').insert({
      id: notificationId,
      title: 'Test Notification',
      body: 'Test body',
      type: 'info',
      category: 'test',
      publish_at: new Date(),
      created_at: new Date(),
      sent: false,
      archived: false,
    });

    // Create user notification entry
    await db('user_notifications').insert({
      id: uuidv4(),
      notification_id: notificationId,
      user_id: userId,
      read: false,
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Subscribe user to 'test' category for preference-based filtering
    await db('user_notification_preferences').insert({
      id: uuidv4(),
      user_id: userId,
      category: 'test',
      subscribed: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  });

  afterAll(async () => {
    await db('user_notification_preferences').where({ user_id: userId }).del();
    await db('user_notifications').where({ user_id: userId }).del();
    await db('notifications').where({ id: notificationId }).del();
    await db('users').where({ id: userId }).del();
  });

  describe('deleteUserNotification', () => {
    it('should delete user notification entry', async () => {
      // Arrange
      const anotherNotificationId = uuidv4();
      const anotherNotifId = uuidv4();

      await db('notifications').insert({
        id: anotherNotificationId,
        title: 'Delete Test',
        body: 'Test',
        type: 'info',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      await db('user_notifications').insert({
        id: anotherNotifId,
        notification_id: anotherNotificationId,
        user_id: userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      await NotificationService.deleteUserNotification(
        anotherNotificationId,
        userId
      );

      // Assert - Should be soft-deleted (deleted=true, not hard deleted)
      const deleted = await db('user_notifications')
        .where({
          notification_id: anotherNotificationId,
          user_id: userId,
        })
        .first();

      expect(deleted).toBeDefined();
      expect(deleted.deleted).toBe(true);

      // Cleanup
      await db('notifications').where({ id: anotherNotificationId }).del();
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      // Act
      const count = await NotificationService.getUnreadCount(userId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(0);
      expect(typeof count).toBe('number');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      // Act
      await NotificationService.markNotificationAsRead(notificationId, userId);

      // Assert
      const updated = await db('user_notifications')
        .where({
          notification_id: notificationId,
          user_id: userId,
        })
        .first();

      expect(updated.read).toBe(true);
      expect(updated.read_at).toBeDefined();
    });
  });

  describe('markNotificationAsUnread', () => {
    it('should mark notification as unread', async () => {
      // Act
      await NotificationService.markNotificationAsUnread(
        notificationId,
        userId
      );

      // Assert
      const updated = await db('user_notifications')
        .where({
          notification_id: notificationId,
          user_id: userId,
        })
        .first();

      expect(updated.read).toBe(false);
      expect(updated.read_at).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      // Act
      const count = await NotificationService.markAllAsRead(userId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(0);

      // Verify all are marked as read
      const unreadCount = await db('user_notifications')
        .where({
          user_id: userId,
          read: false,
        })
        .count({ count: '*' })
        .first();

      const countValue =
        typeof unreadCount?.count === 'string'
          ? parseInt(unreadCount.count, 10)
          : unreadCount?.count || 0;
      expect(countValue).toBe(0);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications with pagination', async () => {
      // Act
      const result = await NotificationService.getUserNotifications(
        userId,
        10,
        0
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);

      if (result.length > 0) {
        expect(result[0]).toHaveProperty('notification_id');
        expect(result[0]).toHaveProperty('read');
        expect(result[0]).toHaveProperty('user_id');
      }
    });
  });
});
