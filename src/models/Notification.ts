import db from '../database/connection';
import { TokenStatusUpdate } from '../types/firebase.types';
import {
  CreateNotificationInput,
  Notification,
  NotificationTargetCriteria,
  PushToken,
  RegisterPushTokenInput,
} from '../types/notification.types';
import { generateUUID } from '../utils/crypto';
import { jsonb } from '../utils/db.utils';

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
    const insertData: any = {
      id: generateUUID(),
      title: notificationData.title,
      body: notificationData.body,
      created_by: createdBy,
    };

    // publish_at is optional; if provided, include it, otherwise DB default will apply
    if (notificationData.publish_at) {
      insertData.publish_at = notificationData.publish_at;
    }

    // Map targetCriteria -> target (JSONB column)
    if (notificationData.targetCriteria) {
      insertData.target = jsonb(notificationData.targetCriteria);
    }

    const [notification] = await db('notifications')
      .insert(insertData)
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
   * Updates the status of a push token.
   * @param token - The token to update
   * @param update - The status update data
   */
  static async updateTokenStatus(
    token: string,
    update: TokenStatusUpdate
  ): Promise<void> {
    await db('push_tokens').where({ token }).update({
      status: update.status,
      last_failure: update.last_failure,
      failure_reason: update.failure_reason,
    });
  }

  /**
   * Updates the status of all tokens for a user on a specific platform
   * @param userId - The ID of the user
   * @param platform - The platform to update tokens for
   * @param update - The status update data
   */
  static async updateUserTokensStatus(
    userId: string,
    platform: string,
    update: TokenStatusUpdate
  ): Promise<void> {
    await db('push_tokens')
      .where({
        user_id: userId,
        platform,
      })
      .update({
        status: update.status,
        last_failure: update.last_failure,
        failure_reason: update.failure_reason,
      });
  }

  /**
   * Finds all push tokens for all users.
   * @returns A list of all push tokens.
   */
  static async findAllPushTokens(
    targetCriteria?: NotificationTargetCriteria
  ): Promise<PushToken[]> {
    let query = db('push_tokens')
      .select('push_tokens.*')
      .join('users', 'users.id', '=', 'push_tokens.user_id');

    if (targetCriteria) {
      if (targetCriteria.registrationDateRange) {
        query = query.whereBetween('users.created_at', [
          targetCriteria.registrationDateRange.start,
          targetCriteria.registrationDateRange.end,
        ]);
      }

      if (
        targetCriteria.minTransactionCount ||
        targetCriteria.maxTransactionCount
      ) {
        const transactionSubquery = db('transactions')
          .select('user_id')
          .count('* as transaction_count')
          .groupBy('user_id')
          .as('transaction_counts');

        query = query.leftJoin(
          transactionSubquery,
          'users.id',
          'transaction_counts.user_id'
        );

        if (targetCriteria.minTransactionCount) {
          query = query.where(
            'transaction_counts.transaction_count',
            '>=',
            targetCriteria.minTransactionCount
          );
        }
        if (targetCriteria.maxTransactionCount) {
          query = query.where(
            'transaction_counts.transaction_count',
            '<=',
            targetCriteria.maxTransactionCount
          );
        }
      }

      if (targetCriteria.minTopupCount || targetCriteria.maxTopupCount) {
        const topupSubquery = db('topup_requests')
          .select('user_id')
          .count('* as topup_count')
          .groupBy('user_id')
          .as('topup_counts');

        query = query.leftJoin(
          topupSubquery,
          'users.id',
          'topup_counts.user_id'
        );

        if (targetCriteria.minTopupCount) {
          query = query.where(
            'topup_counts.topup_count',
            '>=',
            targetCriteria.minTopupCount
          );
        }
        if (targetCriteria.maxTopupCount) {
          query = query.where(
            'topup_counts.topup_count',
            '<=',
            targetCriteria.maxTopupCount
          );
        }
      }

      if (targetCriteria.lastActiveWithinDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(
          cutoffDate.getDate() - targetCriteria.lastActiveWithinDays
        );
        query = query.where('push_tokens.last_seen', '>=', cutoffDate);
      }
    }

    return query;
  }
}
