export interface Transaction {
  id: string;
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
  createdAt: Date;
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
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
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

export interface TransactionQueryResult {
  transactions: Transaction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
