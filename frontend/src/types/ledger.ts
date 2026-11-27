export type LedgerEntrySide = 'debit' | 'credit';

export interface LedgerEntry {
  transactionId: string;
  accountId: string;
  side: LedgerEntrySide;
  amount: number; // minor units (paise)
}

export interface LedgerTransaction {
  eventId: string;
  transactionId: string;
  currency: string;
  description?: string;
  createdAt?: string; // ISO string in JSON
  updatedAt?: string;
  entries?: LedgerEntry[];
}

export interface CreateLedgerTransactionInput {
  eventId: string;
  transactionId: string;
  currency: string;
  description?: string;
  entries: Array<{
    accountId: string;
    side: LedgerEntrySide;
    amount: number;
  }>;
}

export type SubmitState = 'idle' | 'submitting' | 'success' | 'processing' | 'failed_rolled_back' | 'failed_unknown';
export type AttemptStatus = 'success' | 'duplicate' | 'processing' | 'rolled_back' | 'unknown';

export interface Attempt {
  id: number;
  transactionId: string;
  eventId: string;
  amount: number; // minor units
  currency: string;
  status: AttemptStatus;
  message: string;
  at: string; // ISO
}
export interface Pagination {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

export interface LedgerPage {
  transactions: LedgerTransaction[];
  pagination: Pagination;
}