import db from '../database/connection';
import { generateUUID } from '../utils/crypto';
import {
  CreateNotificationInput,
  Notification,
  PushToken,
  RegisterPushTokenInput,
} from '../types/notification.types';

export class NotificationModel {
  /**
   * Creates a new notification.
   * @param notificationData - The data for the new notification.
   * @param createdBy - The ID of the user creating the notification.
   * @returns The newly created notification.
   */
  static async create(
    notificationData: CreateNotificationInput,
    createdBy: string
  ): Promise<Notification> {
    const [notification] = await db('notifications')
      .insert({
        id: generateUUID(),
        ...notificationData,
        created_by: createdBy,
      })
      .returning('*');
    return notification;
  }

  /**
   * Finds all notifications for a user (or all notifications if no userId is provided).
   * @param userId - Optional ID of the user.
   * @returns A list of notifications.
   */
  static async findAll(userId?: string): Promise<Notification[]> {
    let query = db('notifications');
    if (userId) {
      // This logic will depend on how you target notifications.
      // For now, it returns all non-archived notifications.
      // You might have a user_notifications table in a real scenario.
      query = query.where({ archived: false });
    }
    return query.orderBy('publish_at', 'desc');
  }

  /**
   * Registers or updates a push token for a user.
   * @param tokenData - The data for the push token.
   */
  static async registerPushToken(
    tokenData: RegisterPushTokenInput
  ): Promise<void> {
    await db('push_tokens')
      .insert({
        id: generateUUID(),
        user_id: tokenData.userId,
        platform: tokenData.platform,
        token: tokenData.token,
        last_seen: db.fn.now(),
      })
      .onConflict(['user_id', 'platform', 'token'])
      .merge({
        last_seen: db.fn.now(),
      });
  }

  /**
   * Finds all push tokens for a given user.
   * @param userId - The ID of the user.
   * @returns A list of push tokens.
   */
  static async findUserPushTokens(userId: string): Promise<PushToken[]> {
    return db('push_tokens').where({ user_id: userId });
  }

  /**
   * Finds all push tokens for all users.
   * @returns A list of all push tokens.
   */
  static async findAllPushTokens(): Promise<PushToken[]> {
    return db('push_tokens');
  }
}
