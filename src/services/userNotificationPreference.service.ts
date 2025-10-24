import { UserNotificationPreferenceModel } from '../models/UserNotificationPreference';
import { UserNotificationPreference } from '../types/notification.types';
import { ApiError } from '../utils/ApiError';

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
    const preference = await UserNotificationPreferenceModel.update(
      userId,

      category,

      subscribed
    );

    if (!preference) {
      throw new ApiError(404, 'Preference not found');
    }

    return preference;
  }
}
