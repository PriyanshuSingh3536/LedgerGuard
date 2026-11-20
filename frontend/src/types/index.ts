export interface Me {
  userId: string;
  organizationId: string;
  role: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface UsagePoint {
  date: string;
  transactions: number;
  amount: number; // minor units (paise)
}