import { config } from '../config/env';
import db from '../database/connection';
import { NotificationModel } from '../models/Notification';
import {
  CreateNotificationInput,
  RegisterPushTokenInput,
} from '../types/notification.types';
import { logger } from '../utils/logger.utils';
import { FirebaseService } from './firebase.service';

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
   * @param notification - The notification to send.
   */
  private static async sendPushNotifications(notification: any) {
    logger.info(
      `Starting background job to send push notifications for notification ID: ${notification.id}`
    );
    try {
      // Get tokens based on targeting criteria if provided
      const targetedTokens = await NotificationModel.findAllPushTokens(
        notification.targetCriteria
      );

      // Filter out non-active tokens
      const activeTokens = targetedTokens.filter(t => t.status === 'active');
      const tokenStrings = activeTokens.map(t => t.token);

      if (tokenStrings.length > 0) {
        logger.info(
          `Sending notification to ${tokenStrings.length} targeted devices`
        );
        const result = await FirebaseService.sendMulticastPushNotification(
          tokenStrings,
          notification.title,
          notification.body || ''
        );

        // Handle failed tokens
        if (result?.responses) {
          const failedTokens = result.responses
            .map((resp, index) => ({
              token: tokenStrings[index],
              error: resp.error,
            }))
            .filter(item => item.error);

          // Update failed tokens status
          await Promise.all(
            failedTokens.map(async ({ token, error }) => {
              await NotificationModel.updateTokenStatus(token, {
                status: 'invalid',
                failure_reason: error?.message || 'Unknown error',
                last_failure: new Date(),
              });
            })
          );

          if (failedTokens.length > 0) {
            logger.warn(
              `Failed to send notification to ${failedTokens.length} tokens`,
              failedTokens
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        `Error in background job for sending push notifications for notification ID: ${notification.id}`,
        error
      );
    }
  }

  /**
   * Registers a push token for a user.
   * @param tokenData - The data for the push token.
   */
  static async registerPushToken(tokenData: RegisterPushTokenInput) {
    // Persist the token
    await NotificationModel.registerPushToken(tokenData);

    // Subscribe the token to configured topics and role-specific topic if enabled
    const topics: string[] = Array.isArray(
      config.notifications.autoSubscribeTopics
    )
      ? [...config.notifications.autoSubscribeTopics]
      : ['all'];
    try {
      const user = await db('users').where({ id: tokenData.userId }).first();
      if (user && user.role && config.notifications.subscribeRoleTopic) {
        // sanitize role -> topic name
        const roleTopic = `role_${String(user.role).toLowerCase()}`;
        topics.push(roleTopic);
      }
    } catch (err) {
      logger.warn('Unable to query user role for topic subscription', err);
    }

    // Fire-and-forget subscription attempts
    for (const topic of topics) {
      FirebaseService.subscribeTokenToTopic(tokenData.token, topic).catch(e =>
        logger.error('Topic subscription failed', e)
      );
    }
  }

  /**
   * Retrieves all notifications for a user.
   * @param userId - The ID of the user.
   * @returns A list of notifications.
   */
  static async getUserNotifications(userId: string) {
    // This currently returns all notifications, but you could add user-specific logic here.
    return NotificationModel.findAll(userId);
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
}
