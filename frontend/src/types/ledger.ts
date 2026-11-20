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

export type SubmitState = 'idle' | 'submitting' | 'success' | 'failed_rolled_back';