export interface Notification {
  id: string;
  title: string;
  body?: string;
  targetCriteria?: NotificationTargetCriteria;
  publish_at: Date;
  created_by?: string;
  created_at: Date;
  sent: boolean;
  archived: boolean;
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
  targetCriteria?: NotificationTargetCriteria;
  publish_at?: Date;
}

export interface RegisterPushTokenInput {
  userId: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
}
