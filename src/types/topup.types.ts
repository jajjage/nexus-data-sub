export interface TopupRequest {
  id: string;
  userId: string;
  recipientPhone: string;
  externalId?: string;
  operatorId?: string;
  amount: number;
  status:
    | 'pending'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'reversed'
    | 'retry';
  requestPayload?: any;
  operatorProductId?: string;
  supplierId?: string;
  supplierMappingId?: string;
  cost?: number;
  type?: string;
  attemptCount: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateTopupRequestData {
  userId: string;
  recipientPhone: string;
  operatorId: string;
  amount: number;
  requestPayload?: any;
}

export interface UpdateTopupRequestData {
  status?:
    | 'pending'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'reversed'
    | 'retry';
  responsePayload?: any;
  attemptCount?: number;
  lastAttemptAt?: Date;
  completedAt?: Date;
}

export interface TopupRequestFilters {
  userId?: string;
  operatorId?: string;
  status?:
    | 'pending'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'reversed'
    | 'retry'; // Status of the top-up request
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface TopupRequestResponse {
  id: string;
  request_id: string;
  supplier_id: string;
  response_code: string;
  response_message: string;
  response_data?: any;
  created_at: Date;
  updated_at: Date;
}

export interface TopupRequestWithResponses extends TopupRequest {
  responses: TopupRequestResponse[];
}

export interface TopupRequestQueryResult {
  requests: TopupRequestWithResponses[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
