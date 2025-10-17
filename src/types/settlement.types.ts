export interface Settlement {
  id: string;
  providerId: string;
  amount: number;
  fees: number;
  reference: string;
  settlementDate: Date;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSettlementData {
  providerId: string;
  amount: number;
  fees: number;
  reference: string;
  settlementDate: Date;
  status?: 'pending' | 'completed' | 'failed';
}

export interface UpdateSettlementData {
  amount?: number;
  fees?: number;
  reference?: string;
  settlementDate?: Date;
  status?: 'pending' | 'completed' | 'failed';
}

export interface SettlementFilters {
  providerId?: string;
  status?: 'pending' | 'completed' | 'failed';
  startDate?: Date;
  endDate?: Date;
}
