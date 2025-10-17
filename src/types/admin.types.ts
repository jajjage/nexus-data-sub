export interface DashboardStats {
  totalUsers: number | string;
  totalTransactions: number | string;
  totalTopupRequests: number | string;
}

export interface AdminUserView {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: string;
  isVerified: boolean;
  isSuspended: boolean;
  balance: string;
}

export interface UserUpdateData {
  fullName?: string;
  phoneNumber?: string;
}

export interface WalletAdjustmentResult {
  newBalance: number;
}
