export interface Settlement {
  id: string;
  providerId: string;
  amount: number;
  fees: number;
  reference: string;
  settlementDate: Date;
  status: 'pending' | 'completed' | 'failed' | 'processing';
  rawReport?: any;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateSettlementData {
  providerId: string;
  amount: number;
  fees?: number;
  reference: string;
  settlementDate: Date;
  status?: 'pending' | 'completed' | 'failed' | 'processing';
  rawReport?: any;
}

export interface UpdateSettlementData {
  amount?: number;
  fees?: number;
  reference?: string;
  settlementDate?: Date;
  status?: 'pending' | 'completed' | 'failed' | 'processing';
  rawReport?: any;
}

export interface SettlementFilters {
  providerId?: string;
  status?: 'pending' | 'completed' | 'failed' | 'processing';
  dateFrom?: string;
  dateTo?: string;
}
