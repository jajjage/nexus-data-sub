export interface VirtualAccount {
  id: string;
  userId: string;
  provider: string;
  providerVaId: string;
  accountName: string;
  accountNumber: string;
  txRef: string;
  isStatic?: boolean;
  currency: string;
  status: 'active' | 'inactive' | 'closed';
  createdAt: Date;
  updatedAt: Date;
}
