import db from '../database/connection';
import { UserNotificationPreference } from '../types/notification.types';

export class UserNotificationPreferenceModel {
  static async create(
    preferenceData: Omit<
      UserNotificationPreference,
      'id' | 'created_at' | 'updated_at'
    >
  ): Promise<UserNotificationPreference> {
    const { userId, category, subscribed } = preferenceData as any;
    const [preference] = await db('user_notification_preferences')
      .insert({ user_id: userId, category, subscribed })
      .returning('*');

    // normalize returned row to camelCase for consumers
    if (preference && preference.user_id) {
      (preference as any).userId = preference.user_id;
    }
    return preference;
  }

  static async findByUserId(
    userId: string
  ): Promise<UserNotificationPreference[]> {
    const rows = await db('user_notification_preferences').where(
      'user_id',
      userId
    );
    return rows.map((r: any) => ({ ...r, userId: r.user_id }));
  }

  static async findByUserIdAndCategory(
    userId: string,
    category: string
  ): Promise<UserNotificationPreference | null> {
    const preference = await db('user_notification_preferences')
      .where({ user_id: userId, category })
      .first();
    if (preference && preference.user_id) {
      (preference as any).userId = preference.user_id;
    }
    return preference || null;
  }

  static async upsert(
    preferenceData: Omit<
      UserNotificationPreference,
      'id' | 'created_at' | 'updated_at'
    >
  ): Promise<UserNotificationPreference> {
    const { userId, category, subscribed } = preferenceData;
    const [preference] = await db('user_notification_preferences')
      .insert({ user_id: userId, category, subscribed })
      .onConflict(['user_id', 'category'])
      .merge({ subscribed })
      .returning('*');
    if (preference && preference.user_id) {
      (preference as any).userId = preference.user_id;
    }
    return preference;
  }

  static async update(
    userId: string,
    category: string,
    subscribed: boolean
  ): Promise<UserNotificationPreference | null> {
    const [preference] = await db('user_notification_preferences')
      .where({ user_id: userId, category })
      .update({ subscribed })
      .returning('*');
    if (preference && preference.user_id) {
      (preference as any).userId = preference.user_id;
    }
    return preference || null;
  }
}
