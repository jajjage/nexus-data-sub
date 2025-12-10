import db from '../database/connection';
import { UserNotification } from '../types/notification.types';
import { generateUUID } from '../utils/crypto';

/**
 * UserNotification Model
 * Tracks per-user notification read status
 * A single notification can be marked read/unread by different users
 */
export class UserNotificationModel {
  /**
   * Creates entries for a notification for all users matching target criteria
   * @param notificationId - The notification ID
   * @param userIds - Array of user IDs to create entries for
   * @param trx - Optional transaction
   */
  static async createForUsers(
    notificationId: string,
    userIds: string[],
    trx = db
  ): Promise<void> {
    if (userIds.length === 0) return;

    const records = userIds.map(userId => ({
      id: generateUUID(),
      notification_id: notificationId,
      user_id: userId,
      read: false,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await trx('user_notifications').insert(records);
  }

  /**
   * Marks a notification as read for a specific user
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await db('user_notifications')
      .where({
        notification_id: notificationId,
        user_id: userId,
      })
      .update({
        read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });
  }

  /**
   * Marks a notification as unread for a specific user
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  static async markAsUnread(
    notificationId: string,
    userId: string
  ): Promise<void> {
    await db('user_notifications')
      .where({
        notification_id: notificationId,
        user_id: userId,
      })
      .update({
        read: false,
        read_at: null,
        updated_at: new Date(),
      });
  }

  /**
   * Gets all notifications for a user with read status
   * @param userId - The user ID
   * @param limit - Max results
   * @param offset - Pagination offset
   * @returns Notifications with user-specific read status
   */
  static async findByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<(UserNotification & { notification: any })[]> {
    const results = await db('user_notifications as un')
      .join('notifications as n', 'un.notification_id', 'n.id')
      .where('un.user_id', userId)
      .orderBy('n.publish_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select(
        'un.id',
        'un.notification_id',
        'un.user_id',
        'un.read',
        'un.read_at',
        'un.created_at',
        'un.updated_at',
        'n.title',
        'n.body',
        'n.type',
        'n.category',
        'n.publish_at',
        'n.sent',
        'n.archived'
      );

    return results.map(row => ({
      id: row.id,
      notification_id: row.notification_id,
      user_id: row.user_id,
      read: row.read,
      read_at: row.read_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      notification: {
        id: row.notification_id,
        title: row.title,
        body: row.body,
        type: row.type,
        category: row.category,
        publish_at: row.publish_at,
        sent: row.sent,
        archived: row.archived,
      },
    }));
  }

  /**
   * Gets unread count for a user
   * @param userId - The user ID
   * @returns Number of unread notifications
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await db('user_notifications')
      .where({
        user_id: userId,
        read: false,
      })
      .count({ count: '*' })
      .first();

    // Handle both string and number count values from different DB drivers
    const count = result?.count as string | number | undefined;
    return typeof count === 'string' ? parseInt(count, 10) : count || 0;
  }

  /**
   * Gets all unread notifications for a user
   * @param userId - The user ID
   * @returns Array of unread notifications
   */
  static async findUnread(userId: string): Promise<any[]> {
    return db('user_notifications as un')
      .join('notifications as n', 'un.notification_id', 'n.id')
      .where('un.user_id', userId)
      .andWhere('un.read', false)
      .orderBy('n.publish_at', 'desc')
      .select(
        'un.id',
        'un.notification_id',
        'un.user_id',
        'un.read',
        'un.read_at',
        'n.title',
        'n.body',
        'n.type',
        'n.category',
        'n.publish_at'
      );
  }

  /**
   * Marks all notifications as read for a user
   * @param userId - The user ID
   * @returns Number of notifications updated
   */
  static async markAllAsRead(userId: string): Promise<number> {
    const result = await db('user_notifications')
      .where({
        user_id: userId,
        read: false,
      })
      .update({
        read: true,
        read_at: new Date(),
        updated_at: new Date(),
      });

    return result;
  }

  /**
   * Deletes user notification entry
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  static async delete(notificationId: string, userId: string): Promise<void> {
    await db('user_notifications')
      .where({
        notification_id: notificationId,
        user_id: userId,
      })
      .del();
  }

  /**
   * Gets notifications grouped by category for a user
   * @param userId - The user ID
   * @returns Notifications grouped by category
   */
  static async findByUserIdGroupedByCategory(
    userId: string
  ): Promise<Record<string, any[]>> {
    const notifications = await db('user_notifications as un')
      .join('notifications as n', 'un.notification_id', 'n.id')
      .where('un.user_id', userId)
      .orderBy('n.publish_at', 'desc')
      .select(
        'un.id',
        'un.notification_id',
        'un.read',
        'n.title',
        'n.body',
        'n.type',
        'n.category',
        'n.publish_at'
      );

    const grouped: Record<string, any[]> = {};

    notifications.forEach(notif => {
      const category = notif.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(notif);
    });

    return grouped;
  }
}
