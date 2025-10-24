import { NotificationAnalyticsModel } from '../models/NotificationAnalytics';
import { NotificationAnalytics } from '../types/notification.types';

export class NotificationAnalyticsService {
  static async create(
    analyticsData: Omit<NotificationAnalytics, 'id' | 'created_at'>
  ): Promise<NotificationAnalytics> {
    return NotificationAnalyticsModel.create(analyticsData);
  }

  static async getByNotificationId(
    notificationId: string
  ): Promise<NotificationAnalytics[]> {
    return NotificationAnalyticsModel.findByNotificationId(notificationId);
  }

  static async getByUserId(userId: string): Promise<NotificationAnalytics[]> {
    return NotificationAnalyticsModel.findByUserId(userId);
  }
}
