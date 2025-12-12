export interface Notification {
  id: string;
  title: string;
  body?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'alert';
  category?: string;
  targetCriteria?: NotificationTargetCriteria;
}

export interface UserNotification {
  id: string;
  notification_id: string;
  user_id: string;
  read: boolean;
  read_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface PushToken {
  id: string;
  user_id: string;
  platform?: 'ios' | 'android' | 'web';
  token: string;
  last_seen: Date;
  status: 'active' | 'invalid' | 'unregistered';
  last_failure?: Date;
  failure_reason?: string;
}

export interface NotificationTargetCriteria {
  registrationDateRange?: {
    start: Date;
    end: Date;
  };
  minTransactionCount?: number;
  maxTransactionCount?: number;
  minTopupCount?: number;
  maxTopupCount?: number;
  lastActiveWithinDays?: number;
}

export interface CreateNotificationInput {
  title: string;
  body: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'alert';
  category?: string;
  targetCriteria?: NotificationTargetCriteria;
  publish_at?: Date;
}

export interface CreateNotificationFromTemplateInput {
  template_id: string;
  variables?: Record<string, string | number>;
  category?: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'alert';
  targetCriteria?: NotificationTargetCriteria;
  publish_at?: Date;
}

export interface RegisterPushTokenInput {
  userId: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
}

export interface NotificationTemplate {
  id: string; // Changed to string since we're using UUID in the migration
  template_id: string;
  title: string;
  body: string;
  locales: string[]; // Keep as string[] since we handle the JSONB conversion in the service
  created_at: Date;
  updated_at: Date;
}

export interface UserNotificationPreference {
  id: number;
  userId: string;
  category: string;
  subscribed: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface NotificationAnalytics {
  id: number;
  notification_id: string;
  user_id: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  created_at: Date;
}
