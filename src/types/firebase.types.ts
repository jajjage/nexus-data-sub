// Update token status types
export interface TokenStatusUpdate {
  status: 'active' | 'invalid' | 'unregistered';
  last_failure?: Date;
  failure_reason?: string;
}

// Firebase messaging response types
export interface FirebaseMessagingResponse {
  success: boolean;
  error?: {
    code: string;
    message: string;
  };
}

export interface FirebaseMulticastResponse {
  responses: FirebaseMessagingResponse[];
  successCount: number;
  failureCount: number;
}
