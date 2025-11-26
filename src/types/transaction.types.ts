// types/transaction.types.ts

export interface Transaction {
  id: string;
  walletId: string;
  userId: string;
  direction: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
  method: string;
  reference?: string;
  relatedType?: string | null;
  relatedId?: string | null;
  metadata?: any;
  note?: string;
  createdAt: Date;
}

export interface TransactionWithRelated extends Transaction {
  related?: any; // The related entity data (incoming_payment, topup_request, etc.)
}

export interface CreateTransactionData {
  walletId: string;
  userId: string;
  direction: 'debit' | 'credit';
  amount: number;
  balanceAfter: number;
  method: string;
  reference?: string;
  relatedType?: string;
  relatedId?: string;
  metadata?: any;
  note?: string;
}

export interface TransactionFilters {
  userId?: string;
  walletId?: string;
  direction?: 'debit' | 'credit';
  method?: string;
  relatedType?: string;
  relatedId?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  limit?: number;
  includeRelated?: boolean; // NEW: option to fetch related data
}

export interface TransactionQueryResult {
  transactions: Transaction[] | TransactionWithRelated[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
export interface PaginatedTransactions {
  transactions: Transaction[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
