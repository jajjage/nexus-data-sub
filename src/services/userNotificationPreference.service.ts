import { config } from '../config/env';
import { NotificationModel } from '../models/Notification';
import { UserNotificationPreferenceModel } from '../models/UserNotificationPreference';
import { UserNotificationPreference } from '../types/notification.types';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger.utils';
import { FirebaseService } from './firebase.service';

export class UserNotificationPreferenceService {
  /**
   * Initialize default notification preferences for a user
   * Creates preferences for all auto-subscribe topics
   * @param userId - The user ID
   */
  static async initializeDefaultPreferences(userId: string): Promise<void> {
    const configTopics = Array.isArray(config.notifications.autoSubscribeTopics)
      ? config.notifications.autoSubscribeTopics
      : ['all'];

    try {
      for (const topic of configTopics) {
        await UserNotificationPreferenceModel.upsert({
          userId,
          category: topic,
          subscribed: true,
        });
      }
      logger.info(
        `Initialized notification preferences for user ${userId} with topics: ${configTopics.join(', ')}`
      );
    } catch (error) {
      logger.error(
        `Failed to initialize notification preferences for user ${userId}`,
        error
      );
      throw error;
    }
  }

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
    // 1. Upsert the preference in the database (source of truth)
    const preference =
      await UserNotificationPreferenceModel.upsert(preferenceData);

    // 2. Sync with Firebase (the execution layer)
    // Apply this change to ALL of the user's active devices
    const { userId, category, subscribed } = preferenceData;
    this.syncFirebaseTopics(userId, category, subscribed);

    return preference;
  }

  static async updatePreference(
    userId: string,
    category: string,
    subscribed: boolean
  ): Promise<UserNotificationPreference> {
    // 1. Check if preference exists first
    const existing =
      await UserNotificationPreferenceModel.findByUserIdAndCategory(
        userId,
        category
      );

    if (!existing) {
      throw new ApiError(404, 'Preference not found');
    }

    // 2. Update the existing preference
    const preference = await UserNotificationPreferenceModel.update(
      userId,
      category,
      subscribed
    );

    // 3. Sync with Firebase (The Execution Layer)
    // We must apply this change to ALL of the user's active devices
    this.syncFirebaseTopics(userId, category, subscribed);

    return preference as UserNotificationPreference;
  }

  /**
   * Mute all notification categories for a user
   */
  static async muteAllCategories(
    userId: string
  ): Promise<UserNotificationPreference[]> {
    // Get all existing preferences
    const preferences =
      await UserNotificationPreferenceModel.findByUserId(userId);
    const userTokens = await NotificationModel.findUserPushTokens(userId);
    const tokenStrings = userTokens.map(t => t.token);

    // Mute all categories
    const mutedPreferences = await Promise.all(
      preferences.map(pref =>
        UserNotificationPreferenceModel.update(userId, pref.category, false)
      )
    );

    // Unsubscribe from all topics on Firebase (fire-and-forget)
    if (tokenStrings.length > 0) {
      setImmediate(async () => {
        try {
          for (const pref of preferences) {
            await FirebaseService.unsubscribeTokenFromTopic(
              tokenStrings,
              pref.category
            );
          }
          logger.info(`Muted all categories for user ${userId}`);
        } catch (error) {
          logger.error(
            `Failed to unsubscribe user ${userId} from topics`,
            error
          );
        }
      });
    }

    return mutedPreferences.filter(
      p => p !== null
    ) as UserNotificationPreference[];
  }

  /**
   * Unmute all notification categories for a user
   */
  static async unmuteAllCategories(
    userId: string
  ): Promise<UserNotificationPreference[]> {
    // Get all existing preferences
    const preferences =
      await UserNotificationPreferenceModel.findByUserId(userId);
    const userTokens = await NotificationModel.findUserPushTokens(userId);
    const tokenStrings = userTokens.map(t => t.token);

    // Unmute all categories
    const unmutedPreferences = await Promise.all(
      preferences.map(pref =>
        UserNotificationPreferenceModel.update(userId, pref.category, true)
      )
    );

    // Subscribe to all topics on Firebase (fire-and-forget)
    if (tokenStrings.length > 0) {
      setImmediate(async () => {
        try {
          for (const pref of preferences) {
            await FirebaseService.subscribeTokenToTopic(
              tokenStrings,
              pref.category
            );
          }
          logger.info(`Unmuted all categories for user ${userId}`);
        } catch (error) {
          logger.error(`Failed to subscribe user ${userId} to topics`, error);
        }
      });
    }

    return unmutedPreferences.filter(
      p => p !== null
    ) as UserNotificationPreference[];
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
