import { config } from '../config/env';
import db from '../database/connection';
import { NotificationModel } from '../models/Notification';
import { UserNotificationModel } from '../models/UserNotification';
import { UserNotificationPreferenceModel } from '../models/UserNotificationPreference';
import {
  CreateNotificationInput,
  RegisterPushTokenInput,
} from '../types/notification.types';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger.utils';
import { FirebaseService } from './firebase.service';
import { UserNotificationPreferenceService } from './userNotificationPreference.service';

export class NotificationService {
  /**
   * Creates a notification and triggers a background job to send it to all users.
   * @param notificationData - The data for the new notification.
   * @param createdBy - The ID of the admin creating the notification.
   * @returns The newly created notification.
   */
  static async createAndSend(
    notificationData: CreateNotificationInput,
    createdBy: string
  ) {
    const notification = await NotificationModel.create(
      notificationData,
      createdBy
    );

    // Fire and forget: Don't await this
    this.sendPushNotifications(notification);

    return notification;
  }

  /**
   * Background job to send push notifications.
   * Publishes notification to Firebase topic (category-based broadcast)
   * Firebase automatically sends to all tokens subscribed to that topic
   * @param notification - The notification to send.
   */
  private static async sendPushNotifications(notification: any) {
    logger.info(
      `Starting background job to send push notifications for notification ID: ${notification.id}`
    );
    try {
      // Determine which topic to publish to
      // Default to 'all' if no category specified
      const topic = notification.category || 'all';

      logger.info(
        `Publishing notification to Firebase topic: ${topic}. Notification ID: ${notification.id}`
      );

      // Publish to Firebase topic - this broadcasts to all devices subscribed to the topic
      const result = await FirebaseService.sendTopicMessage(
        topic,
        notification.title,
        notification.body || ''
      );

      if (result) {
        // Mark notification as sent in database
        await db('notifications')
          .where({ id: notification.id })
          .update({ sent: true });

        logger.info(
          `Notification ${notification.id} successfully published to topic '${topic}'. Message ID: ${result}`
        );
      }
    } catch (error) {
      logger.error(
        `Error publishing notification ${notification.id} to Firebase topic`,
        error
      );
      // Don't throw - allow the notification record to exist even if Firebase send fails
    }
  }

  /**
   * Registers a push token for a user.
   * @param tokenData - The data for the push token.
   */
  static async registerPushToken(tokenData: RegisterPushTokenInput) {
    // 1. Persist the token in Postgres
    await NotificationModel.registerPushToken(tokenData);

    // 2. Initialize auto-subscribe topics as user preferences (if not already present)
    await UserNotificationPreferenceService.initializeDefaultPreferences(
      tokenData.userId
    );

    // Use a Set to store topics to ensure uniqueness
    const topicsToSubscribe = new Set<string>();

    // ---------------------------------------------------------
    // A. CONFIG DEFAULTS (e.g., 'all', 'security_alerts')
    // ---------------------------------------------------------
    const configTopics = Array.isArray(config.notifications.autoSubscribeTopics)
      ? config.notifications.autoSubscribeTopics
      : ['all'];

    configTopics.forEach((t: string) => topicsToSubscribe.add(t));

    // ---------------------------------------------------------
    // B. ROLE-BASED TOPICS (e.g., 'role_admin', 'role_staff')
    // ---------------------------------------------------------
    try {
      const user = await db('users').where({ id: tokenData.userId }).first();

      if (user && user.role && config.notifications.subscribeRoleTopic) {
        // Sanitize role -> topic name (e.g. "Super Admin" -> "role_super_admin")
        const roleTopic = `role_${String(user.role).toLowerCase().replace(/\s+/g, '_')}`;
        topicsToSubscribe.add(roleTopic);
      }
    } catch (err) {
      logger.warn('Unable to query user role for topic subscription', err);
    }

    // ---------------------------------------------------------
    // C. USER PREFERENCES (e.g., 'marketing', 'updates')
    // ---------------------------------------------------------
    try {
      const userPreferences =
        await UserNotificationPreferenceModel.findByUserId(tokenData.userId);

      userPreferences.forEach(pref => {
        if (pref.subscribed) {
          topicsToSubscribe.add(pref.category);
        }
      });
    } catch (err) {
      logger.warn(
        'Unable to query user preferences for topic subscription',
        err
      );
    }

    // ---------------------------------------------------------
    // D. EXECUTE SUBSCRIPTIONS
    // ---------------------------------------------------------
    // Note: Firebase API requires us to subscribe (Token[]) to (Topic).
    // Since we have 1 Token and Many Topics, we must loop through the topics.

    const uniqueTopics = Array.from(topicsToSubscribe);
    const tokenArray = [tokenData.token]; // Your updated service expects an array

    logger.info(
      `Subscribing user ${tokenData.userId} to topics: ${uniqueTopics.join(', ')}`
    );

    // We use Promise.all to do them in parallel for speed
    await Promise.all(
      uniqueTopics.map(topic =>
        FirebaseService.subscribeTokenToTopic(tokenArray, topic).catch(e =>
          logger.error(`Failed to subscribe to topic: ${topic}`, e)
        )
      )
    );
  }

  /**
   * Sends a push notification to a specific user.
   * @param userId - The ID of the user to send the notification to.
   * @param title - The title of the notification.
   * @param body - The body of the notification.
   */
  static async sendToUser(userId: string, title: string, body: string) {
    try {
      // 1. Get all tokens for this user
      const userTokens = await NotificationModel.findUserPushTokens(userId);

      if (!userTokens.length) return;

      const tokenStrings = userTokens.map(t => t.token);

      // 2. Send Multicast (This returns detailed success/fail info)
      const result = await FirebaseService.sendMulticastPushNotification(
        tokenStrings,
        title,
        body
      );

      // 3. OPPORTUNISTIC CLEANUP
      // If any specific token failed, we remove it from Postgres immediately.
      if (result.failureCount > 0 && result.responses) {
        const invalidTokens: string[] = [];

        result.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const errorCode = resp.error.code;
            // These codes mean the app was uninstalled or token expired
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(tokenStrings[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          logger.info(
            `Removing ${invalidTokens.length} dead tokens for user ${userId}`
          );

          // Use your model to delete these rows completely
          await NotificationModel.deleteTokens(invalidTokens);
        }
      }
    } catch (error) {
      logger.error(`Error sending to user ${userId}`, error);
    }
  }

  /**
   * Gets notifications for a user with pagination using preference-based filtering
   * NO bulk inserts - just query based on user preferences
   * Only tracks read/delete when user interacts
   * @param userId - The user ID
   * @param limit - Max results
   * @param offset - Pagination offset
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    // Get user's subscribed categories
    const preferences =
      await UserNotificationPreferenceModel.findByUserId(userId);
    const subscribedCategories = preferences
      .filter(p => p.subscribed)
      .map(p => p.category);

    // If user is not subscribed to any category, return empty array
    if (subscribedCategories.length === 0) {
      return [];
    }

    // Fetch notifications matching subscribed categories
    // LEFT JOIN with user_notifications to get read/delete status if user interacted
    const results = await db('notifications as n')
      .leftJoin('user_notifications as un', qb => {
        qb.on('n.id', '=', 'un.notification_id').andOn(
          'un.user_id',
          '=',
          db.raw('?', [userId])
        );
      })
      .whereIn('n.category', subscribedCategories)
      .andWhere('n.archived', false)
      .andWhere(qb => {
        // Only show if not deleted by user
        qb.whereNull('un.id').orWhere('un.deleted', '!=', true);
      })
      .orderBy('n.publish_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select(
        'n.id',
        'n.title',
        'n.body',
        'n.type',
        'n.category',
        'n.publish_at',
        'n.sent',
        'n.archived',
        'n.created_at',
        'un.id as user_notif_id',
        'un.read',
        'un.read_at',
        'un.user_id'
      );

    // Transform results to match expected API response
    return results.map(row => ({
      id: row.user_notif_id || row.id,
      notification_id: row.id,
      user_id: userId,
      read: row.read || false, // Default to false if no tracking entry
      read_at: row.read_at || null,
      created_at: row.created_at,
      updated_at: row.created_at,
      notification: {
        id: row.id,
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
   * Gets unread count for a user based on preferences
   * Counts notifications they're subscribed to that they haven't marked as read
   * @param userId - The user ID
   */
  static async getUnreadCount(userId: string): Promise<number> {
    // Get user's subscribed categories
    const preferences =
      await UserNotificationPreferenceModel.findByUserId(userId);
    const subscribedCategories = preferences
      .filter(p => p.subscribed)
      .map(p => p.category);

    if (subscribedCategories.length === 0) {
      return 0;
    }

    // Count unread notifications in subscribed categories
    // A notification is unread if user hasn't created a tracking entry marking it as read
    const result = await db('notifications as n')
      .leftJoin('user_notifications as un', qb => {
        qb.on('n.id', '=', 'un.notification_id').andOn(
          'un.user_id',
          '=',
          db.raw('?', [userId])
        );
      })
      .whereIn('n.category', subscribedCategories)
      .andWhere('n.archived', false)
      .where(qb => {
        // No tracking entry OR tracking entry exists with read=false
        qb.whereNull('un.id').orWhere('un.read', '!=', true);
      })
      .count({ count: '*' })
      .first();

    const count = result?.count as string | number | undefined;
    return typeof count === 'string' ? parseInt(count, 10) : count || 0;
  }

  /**
   * Marks a notification as read when user clicks it
   * Creates a tracking entry ONLY when user explicitly marks as read
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  static async markNotificationAsRead(
    notificationId: string,
    userId: string
  ): Promise<void> {
    // Check if tracking entry exists
    const existing = await db('user_notifications')
      .where({
        notification_id: notificationId,
        user_id: userId,
      })
      .first();

    if (existing) {
      // Update existing entry
      await UserNotificationModel.markAsRead(notificationId, userId);
    } else {
      // Create new tracking entry with read=true
      const { generateUUID } = await import('../utils/crypto');
      const now = new Date();
      await db('user_notifications').insert({
        id: generateUUID(),
        notification_id: notificationId,
        user_id: userId,
        read: true,
        read_at: now,
        created_at: now,
        updated_at: now,
      });
    }
  }

  /**
   * Marks a notification as unread when user unmarked it
   * Creates a tracking entry ONLY when user explicitly marks as unread
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  static async markNotificationAsUnread(
    notificationId: string,
    userId: string
  ): Promise<void> {
    // Check if tracking entry exists
    const existing = await db('user_notifications')
      .where({
        notification_id: notificationId,
        user_id: userId,
      })
      .first();

    if (existing) {
      // Update existing entry
      await UserNotificationModel.markAsUnread(notificationId, userId);
    } else {
      // Create new tracking entry with read=false
      const { generateUUID } = await import('../utils/crypto');
      const now = new Date();
      await db('user_notifications').insert({
        id: generateUUID(),
        notification_id: notificationId,
        user_id: userId,
        read: false,
        read_at: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  /**
   * Marks all unread notifications as read for a user
   * Only marks those in subscribed categories as read
   * @param userId - The user ID
   */
  static async markAllAsRead(userId: string): Promise<number> {
    // Get user's subscribed categories
    const preferences =
      await UserNotificationPreferenceModel.findByUserId(userId);
    const subscribedCategories = preferences
      .filter(p => p.subscribed)
      .map(p => p.category);

    if (subscribedCategories.length === 0) {
      return 0;
    }

    // Find all unread notifications in subscribed categories
    const unreadNotifs = await db('notifications as n')
      .leftJoin('user_notifications as un', qb => {
        qb.on('n.id', '=', 'un.notification_id').andOn(
          'un.user_id',
          '=',
          db.raw('?', [userId])
        );
      })
      .whereIn('n.category', subscribedCategories)
      .andWhere('n.archived', false)
      .andWhere(qb => {
        qb.whereNull('un.id').orWhere('un.read', false);
      })
      .select('n.id');

    if (unreadNotifs.length === 0) {
      return 0;
    }

    const notifIds = unreadNotifs.map(n => n.id);
    const now = new Date();

    // Update existing tracking entries
    const updatedCount = await db('user_notifications')
      .whereIn('notification_id', notifIds)
      .andWhere('user_id', userId)
      .andWhere('read', false)
      .update({
        read: true,
        read_at: now,
        updated_at: now,
      });

    // Create entries for new notifications (not yet in user_notifications)
    const existingNotifIds = await db('user_notifications')
      .where('user_id', userId)
      .whereIn('notification_id', notifIds)
      .select('notification_id');

    const existingIds = existingNotifIds.map(e => e.notification_id as string);
    const newNotifIds = notifIds.filter(id => !existingIds.includes(id));

    if (newNotifIds.length > 0) {
      const { generateUUID } = await import('../utils/crypto');
      const newRecords = newNotifIds.map(notifId => ({
        id: generateUUID(),
        notification_id: notifId,
        user_id: userId,
        read: true,
        read_at: now,
        created_at: now,
        updated_at: now,
      }));

      await db('user_notifications').insert(newRecords);
    }

    return updatedCount + newNotifIds.length;
  }

  /**
   * Deletes a user's notification (removes from user's list)
   * Soft-deletes by setting deleted=true in user_notifications
   * Keeps the record for audit/analytics but hides from user
   * @param notificationId - The notification ID
   * @param userId - The user ID
   */
  static async deleteUserNotification(
    notificationId: string,
    userId: string
  ): Promise<void> {
    // Verify notification exists
    const notification = await db('notifications')
      .where({ id: notificationId })
      .first();

    if (!notification) {
      throw new ApiError(404, 'Notification not found');
    }

    // Check if tracking entry exists
    const existing = await db('user_notifications')
      .where({
        notification_id: notificationId,
        user_id: userId,
      })
      .first();

    if (existing) {
      // Soft delete - mark as deleted
      await db('user_notifications')
        .where({
          notification_id: notificationId,
          user_id: userId,
        })
        .update({
          deleted: true,
          updated_at: new Date(),
        });
    } else {
      // Create tracking entry with deleted=true
      const { generateUUID } = await import('../utils/crypto');
      const now = new Date();
      await db('user_notifications').insert({
        id: generateUUID(),
        notification_id: notificationId,
        user_id: userId,
        read: false,
        deleted: true,
        created_at: now,
        updated_at: now,
      });
    }
    logger.info(`Deleted notification ${notificationId} for user ${userId}`);
  }

  /**
   * Edit/update a notification (admin)
   */
  static async editNotification(notificationId: string, updates: Partial<any>) {
    try {
      const updateData: any = {};

      if (updates.title) updateData.title = updates.title;
      if (updates.body) updateData.body = updates.body;
      if (updates.type) updateData.type = updates.type;
      if (updates.category) updateData.category = updates.category;
      if (updates.targetCriteria)
        updateData.target_criteria = JSON.stringify(updates.targetCriteria);
      if (updates.publish_at) updateData.publish_at = updates.publish_at;

      const notifications = await db('notifications')
        .where({ id: notificationId })
        .update(updateData)
        .returning('*');

      if (!notifications || notifications.length === 0) {
        return null;
      }

      const notification = notifications[0];
      if (notification && notification.target_criteria) {
        (notification as any).targetCriteria = JSON.parse(
          notification.target_criteria
        );
      }

      logger.info(`Notification ${notificationId} updated`);
      return notification;
    } catch (error) {
      logger.error(`Failed to update notification ${notificationId}`, error);
      throw error;
    }
  }

  /**
   * Archive a notification (soft delete)
   */
  static async archiveNotification(notificationId: string) {
    try {
      const notifications = await db('notifications')
        .where({ id: notificationId })
        .update({ archived: true })
        .returning('*');

      if (!notifications || notifications.length === 0) {
        return null;
      }

      const notification = notifications[0];
      if (notification && notification.target_criteria) {
        (notification as any).targetCriteria = JSON.parse(
          notification.target_criteria
        );
      }

      logger.info(`Notification ${notificationId} archived`);
      return notification;
    } catch (error) {
      logger.error(`Failed to archive notification ${notificationId}`, error);
      throw error;
    }
  }

  /**
   * List all notifications with optional filters
   */
  static async listNotifications(
    limit: number = 50,
    offset: number = 0,
    includeArchived: boolean = false
  ) {
    let query = db('notifications');

    if (!includeArchived) {
      query = query.where({ archived: false });
    }

    const notifications = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('*');

    const countQuery = db('notifications');
    const [{ count }] = await (
      includeArchived ? countQuery : countQuery.where({ archived: false })
    ).count('* as count');

    // Parse targetCriteria for each notification
    const parsed = notifications.map(n => {
      if (n.target_criteria) {
        (n as any).targetCriteria = JSON.parse(n.target_criteria);
      }
      return n;
    });

    return {
      notifications: parsed,
      total: parseInt(count as any),
      limit,
      offset,
    };
  }
}
