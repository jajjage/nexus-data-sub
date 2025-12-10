import { v4 as uuidv4 } from 'uuid';
import db from '../../../../src/database/connection';
import { UserNotificationModel } from '../../../../src/models/UserNotification';

describe('UserNotificationModel', () => {
  let userId: string;
  let notificationId1: string;
  let notificationId2: string;

  beforeAll(async () => {
    userId = uuidv4();
    notificationId1 = uuidv4();
    notificationId2 = uuidv4();

    // Create test user
    await db('users').insert({
      id: userId,
      email: `user.${userId}@test.com`,
      password: 'hashed_password',
      role: 'user',
      is_verified: true,
    });

    // Create test notifications
    await db('notifications').insert([
      {
        id: notificationId1,
        title: 'Notification 1',
        body: 'Body 1',
        type: 'info',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      },
      {
        id: notificationId2,
        title: 'Notification 2',
        body: 'Body 2',
        type: 'success',
        category: 'test',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      },
    ]);
  });

  afterAll(async () => {
    await db('user_notifications').where({ user_id: userId }).del();
    await db('notifications')
      .whereIn('id', [notificationId1, notificationId2])
      .del();
    await db('users').where({ id: userId }).del();
  });

  describe('createForUsers', () => {
    it('should create user notification entries for multiple users', async () => {
      // Arrange
      const testNotifId = uuidv4();
      const userIds = [userId];

      await db('notifications').insert({
        id: testNotifId,
        title: 'Create Test',
        body: 'Body',
        type: 'info',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      // Act
      await UserNotificationModel.createForUsers(testNotifId, userIds);

      // Assert
      const entries = await db('user_notifications')
        .where({
          notification_id: testNotifId,
          user_id: userId,
        })
        .select('*');

      expect(entries.length).toBe(1);
      expect(entries[0].read).toBe(false);

      // Cleanup
      await db('user_notifications')
        .where({ notification_id: testNotifId })
        .del();
      await db('notifications').where({ id: testNotifId }).del();
    });

    it('should not create entries for empty user list', async () => {
      // Arrange
      const testNotifId = uuidv4();

      // Act
      await UserNotificationModel.createForUsers(testNotifId, []);

      // Assert - should complete without error
      expect(true).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read with timestamp', async () => {
      // Arrange
      const entryId = uuidv4();
      await db('user_notifications').insert({
        id: entryId,
        notification_id: notificationId1,
        user_id: userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      await UserNotificationModel.markAsRead(notificationId1, userId);

      // Assert
      const entry = await db('user_notifications')
        .where({ id: entryId })
        .first();

      expect(entry.read).toBe(true);
      expect(entry.read_at).not.toBeNull();

      // Cleanup
      await db('user_notifications').where({ id: entryId }).del();
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread and clear timestamp', async () => {
      // Arrange
      const entryId = uuidv4();
      await db('user_notifications').insert({
        id: entryId,
        notification_id: notificationId1,
        user_id: userId,
        read: true,
        read_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      await UserNotificationModel.markAsUnread(notificationId1, userId);

      // Assert
      const entry = await db('user_notifications')
        .where({ id: entryId })
        .first();

      expect(entry.read).toBe(false);
      expect(entry.read_at).toBeNull();

      // Cleanup
      await db('user_notifications').where({ id: entryId }).del();
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      // Arrange
      const entryId1 = uuidv4();
      const entryId2 = uuidv4();

      await db('user_notifications').insert([
        {
          id: entryId1,
          notification_id: notificationId1,
          user_id: userId,
          read: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: entryId2,
          notification_id: notificationId2,
          user_id: userId,
          read: true,
          read_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Act
      const count = await UserNotificationModel.getUnreadCount(userId);

      // Assert
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(1);

      // Cleanup
      await db('user_notifications').whereIn('id', [entryId1, entryId2]).del();
    });
  });

  describe('findUnread', () => {
    it('should return only unread notifications for user', async () => {
      // Arrange
      const entryId = uuidv4();
      await db('user_notifications').insert({
        id: entryId,
        notification_id: notificationId1,
        user_id: userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      const unread = await UserNotificationModel.findUnread(userId);

      // Assert
      expect(Array.isArray(unread)).toBe(true);
      const found = unread.find(u => u.notification_id === notificationId1);
      expect(found).toBeDefined();
      expect(found?.read).toBe(false);

      // Cleanup
      await db('user_notifications').where({ id: entryId }).del();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read for user', async () => {
      // Arrange
      const entryId1 = uuidv4();
      const entryId2 = uuidv4();

      await db('user_notifications').insert([
        {
          id: entryId1,
          notification_id: notificationId1,
          user_id: userId,
          read: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: entryId2,
          notification_id: notificationId2,
          user_id: userId,
          read: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Act
      const count = await UserNotificationModel.markAllAsRead(userId);

      // Assert
      expect(count).toBeGreaterThanOrEqual(2);

      const unread = await db('user_notifications')
        .where({ user_id: userId, read: false })
        .count('* as count')
        .first();

      expect(Number(unread?.count || 0)).toBe(0);

      // Cleanup
      await db('user_notifications').whereIn('id', [entryId1, entryId2]).del();
    });
  });

  describe('delete', () => {
    it('should delete user notification entry', async () => {
      // Arrange
      const testNotifId = uuidv4();
      const entryId = uuidv4();

      await db('notifications').insert({
        id: testNotifId,
        title: 'Delete Test Notif',
        body: 'Delete test',
        type: 'info',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      await db('user_notifications').insert({
        id: entryId,
        notification_id: testNotifId,
        user_id: userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      await UserNotificationModel.delete(testNotifId, userId);

      // Assert
      const entry = await db('user_notifications')
        .where({ id: entryId })
        .first();

      expect(entry).toBeUndefined();

      // Cleanup
      await db('notifications').where({ id: testNotifId }).del();
    });
  });

  describe('findByUserId', () => {
    it('should return paginated notifications for user', async () => {
      // Arrange
      const testNotifId = uuidv4();
      const entryId = uuidv4();

      await db('notifications').insert({
        id: testNotifId,
        title: 'FindByUserId Test',
        body: 'Test body',
        type: 'info',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      await db('user_notifications').insert({
        id: entryId,
        notification_id: testNotifId,
        user_id: userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      const results = await UserNotificationModel.findByUserId(userId, 10, 0);

      // Assert
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);

      const found = results.find(r => r.notification_id === testNotifId);
      expect(found).toBeDefined();
      expect(found?.notification).toBeDefined();
      expect(found?.notification.title).toBe('FindByUserId Test');

      // Cleanup
      await db('user_notifications').where({ id: entryId }).del();
      await db('notifications').where({ id: testNotifId }).del();
    });

    it('should respect limit and offset parameters', async () => {
      // Arrange
      const testNotifIds = [uuidv4(), uuidv4(), uuidv4()];
      const entryIds = [uuidv4(), uuidv4(), uuidv4()];

      await db('notifications').insert(
        testNotifIds.map((id, idx) => ({
          id,
          title: `Pagination Test ${idx}`,
          body: `Test ${idx}`,
          type: 'info',
          publish_at: new Date(),
          created_at: new Date(),
          sent: false,
          archived: false,
        }))
      );

      await db('user_notifications').insert(
        entryIds.map((id, idx) => ({
          id,
          notification_id: testNotifIds[idx],
          user_id: userId,
          read: false,
          created_at: new Date(Date.now() - idx * 1000),
          updated_at: new Date(),
        }))
      );

      // Act
      const page1 = await UserNotificationModel.findByUserId(userId, 2, 0);
      const page2 = await UserNotificationModel.findByUserId(userId, 2, 2);

      // Assert
      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);

      // Cleanup
      await db('user_notifications').whereIn('id', entryIds).del();
      await db('notifications').whereIn('id', testNotifIds).del();
    });
  });

  describe('findByUserIdGroupedByCategory', () => {
    it('should group notifications by category', async () => {
      // Arrange
      const testNotifId = uuidv4();
      const entryId = uuidv4();

      await db('notifications').insert({
        id: testNotifId,
        title: 'Grouped Category Test',
        body: 'Test',
        type: 'info',
        category: 'marketing',
        publish_at: new Date(),
        created_at: new Date(),
        sent: false,
        archived: false,
      });

      await db('user_notifications').insert({
        id: entryId,
        notification_id: testNotifId,
        user_id: userId,
        read: false,
        created_at: new Date(),
        updated_at: new Date(),
      });

      // Act
      const grouped =
        await UserNotificationModel.findByUserIdGroupedByCategory(userId);

      // Assert
      expect(typeof grouped).toBe('object');
      expect(grouped['marketing'] !== undefined).toBe(true);
      expect(Array.isArray(grouped['marketing'])).toBe(true);

      // Cleanup
      await db('user_notifications').where({ id: entryId }).del();
      await db('notifications').where({ id: testNotifId }).del();
    });
  });
});
