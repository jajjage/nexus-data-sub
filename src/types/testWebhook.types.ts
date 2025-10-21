// src/types/testWebhook.types.ts

export interface TestWebhookPayload {
  userId: string;
  amount: number;
  tx_ref: string;
  provider?: string;
  providerVaId?: string;
  [key: string]: any;
}

export interface TestWebhookRequest extends Express.Request {
  rawBody?: string;
  webhookEvent?: any;
  body: TestWebhookPayload;
}
