import { NotificationModel } from '../models/Notification';
import { UserNotificationPreferenceModel } from '../models/UserNotificationPreference';
import { UserNotificationPreference } from '../types/notification.types';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger.utils';
import { FirebaseService } from './firebase.service';

export class UserNotificationPreferenceService {
  static async getPreferences(
    userId: string
  ): Promise<UserNotificationPreference[]> {
    return UserNotificationPreferenceModel.findByUserId(userId);
  }

  static async upsertPreference(
    preferenceData: Omit<
      UserNotificationPreference,
      'id' | 'created_at' | 'updated_at'
    >
  ): Promise<UserNotificationPreference> {
    return UserNotificationPreferenceModel.upsert(preferenceData);
  }

  static async updatePreference(
    userId: string,
    category: string,
    subscribed: boolean
  ): Promise<UserNotificationPreference> {
    // 1. Update the Database (Source of Truth)
    const preference = await UserNotificationPreferenceModel.update(
      userId,
      category,
      subscribed
    );

    if (!preference) {
      throw new ApiError(404, 'Preference not found');
    }

    // 2. Sync with Firebase (The Execution Layer)
    // We must apply this change to ALL of the user's active devices
    this.syncFirebaseTopics(userId, category, subscribed);

    return preference;
  }

  /**
   * Helper to sync Postgres preference with Firebase Topics
   */
  private static async syncFirebaseTopics(
    userId: string,
    topic: string,
    isSubscribed: boolean
  ) {
    try {
      // Fetch all active tokens for this user
      const userTokens = await NotificationModel.findUserPushTokens(userId);
      const tokenStrings = userTokens.map(t => t.token);

      if (tokenStrings.length === 0) return;

      if (isSubscribed) {
        // User wants notifications -> Subscribe tokens to topic
        await FirebaseService.subscribeTokenToTopic(tokenStrings, topic); // Note: Update FirebaseService to accept array
      } else {
        // User opted out -> Unsubscribe tokens from topic
        await FirebaseService.unsubscribeTokenFromTopic(tokenStrings, topic);
      }

      logger.info(
        `Synced topic '${topic}' for user ${userId} (Subscribed: ${isSubscribed})`
      );
    } catch (error) {
      // Don't fail the HTTP request if Firebase sync fails, but log it clearly
      logger.error(`Failed to sync firebase topic for user ${userId}`, error);
    }
  }
}
