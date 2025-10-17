import { Request } from 'express';

export interface WebhookEvent {
  id: number;
  provider: string;
  event_type: string | null;
  event_id: string | null;
  payload: Record<string, any>;
  headers: Record<string, any>;
  signature_ok: boolean;
  processed: boolean;
  processed_at: Date | null;
  created_at: Date;
}

export interface IncomingPayment {
  id: number;
  provider: string;
  provider_reference: string;
  provider_va_id: string;
  virtual_account_id: number | null;
  user_id: string | null;
  amount: number;
  currency: string;
  status: string;
  raw_payload: Record<string, any>;
  received_at: Date;
  created_at: Date;
}

export interface WebhookRequest extends Request {
  rawBody?: string;
  webhookEvent?: WebhookEvent;
  incomingPayment?: IncomingPayment;
}

export interface Provider {
  id: string;
  name: string;
  api_base: string | null;
  webhook_secret: string | null;
  is_active: boolean;
  config: Record<string, any> | null;
  created_at: Date;
}

// Types for external provider payloads
export interface PalmPayWebhookPayload {
  event_type?: string;
  event_id?: string;
  txn_id?: string;
  transaction_id?: string;
  virtual_account_id?: string;
  account_number?: string;
  amount?: string | number;
  currency?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface WebhookResult {
  success: boolean;
  message: string;
  statusCode: number;
  data?: {
    webhookEventId?: number;
    incomingPaymentId?: number;
    userId?: string;
    virtualAccountId?: number;
  };
}

// Wallet related types
export interface WalletTransaction {
  id: number;
  user_id: string;
  kind: 'credit' | 'debit';
  amount: number;
  balance_after: number;
  source: string;
  reference: string;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface Wallet {
  user_id: string;
  balance: number;
  currency: string;
  updated_at: Date;
}
