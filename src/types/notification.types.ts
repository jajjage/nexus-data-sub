export interface Notification {
  id: string;
  title: string;
  body?: string;
  target: any;
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
}

export interface CreateNotificationInput {
  title: string;
  body: string;
  // Add more fields as needed for targeting specific users, e.g.,
  // userIds?: string[];
  // topic?: string;
}

export interface RegisterPushTokenInput {
  userId: string;
  platform: 'ios' | 'android' | 'web';
  token: string;
}
