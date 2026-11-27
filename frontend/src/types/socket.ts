export type ConnectionStatus = 'connecting' | 'live' | 'offline' | 'disabled';
export type TxStatus = 'success' | 'failed' | 'rolled_back';

// Usage ke delta: "aaj itni transactions aur itna amount aur jud gaya"
export interface UsageUpdate {
  date: string; // YYYY-MM-DD
  transactions: number;
  amount: number; // minor units (paise)
}

export interface TransactionUpdate {
  transactionId: string;
  currency: string;
  amount: number; // minor units (paise)
  status: TxStatus;
  createdAt: string; // ISO string
}

// Event names (backend ke saath confirm karne hain)
export interface ServerEvents {
  'usage:update': UsageUpdate;
  'transaction:update': TransactionUpdate;
}