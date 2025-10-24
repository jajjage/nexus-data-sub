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
    await NotificationModel.registerPushToken(tokenData);
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
    logger.info(`Sending push notification to user ID: ${userId}`);
    try {
      const userTokens = await NotificationModel.findUserPushTokens(userId);
      const tokenStrings = userTokens.map(t => t.token);

      if (tokenStrings.length > 0) {
        await FirebaseService.sendMulticastPushNotification(
          tokenStrings,
          title,
          body
        );
      }
    } catch (error) {
      logger.error(
        `Error sending push notification to user ID: ${userId}`,
        error
      );
    }
  }
}
