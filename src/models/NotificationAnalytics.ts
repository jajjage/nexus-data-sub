import db from '../database/connection';
import { NotificationAnalytics } from '../types/notification.types';

export class NotificationAnalyticsModel {
  static async create(
    analyticsData: Omit<NotificationAnalytics, 'id' | 'created_at'>
  ): Promise<NotificationAnalytics> {
    const [analytics] = await db('notification_analytics')
      .insert(analyticsData)
      .returning('*');
    return analytics;
  }

  static async findByNotificationId(
    notificationId: string
  ): Promise<NotificationAnalytics[]> {
    return db('notification_analytics').where(
      'notification_id',
      notificationId
    );
  }

  static async findByUserId(userId: string): Promise<NotificationAnalytics[]> {
    return db('notification_analytics').where('user_id', userId);
  }
}
