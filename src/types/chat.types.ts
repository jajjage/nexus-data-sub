export interface Channel {
  id: string;
  name?: string;
  is_support: boolean;
  created_at: Date;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: string;
  joined_at: Date;
}

export interface Message {
  id: string;
  client_msg_id: string;
  channel_id: string;
  sender_id?: string;
  body?: string;
  attachments: any[];
  metadata: any;
  seq: number;
  status: string;
  created_at: Date;
}

export interface MessageReceipt {
  id: string;
  message_id: string;
  user_id: string;
  delivered_at?: Date;
  read_at?: Date;
}

export interface CreateMessageInput {
  client_msg_id: string;
  channel_id: string;
  sender_id: string;
  body: string;
  attachments?: any[];
}
