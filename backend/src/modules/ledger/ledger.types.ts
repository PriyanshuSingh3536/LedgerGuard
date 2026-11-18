export type LedgerEntrySide = "debit" | "credit";

// Represents one individual ledger entry.
export interface LedgerEntry {
  transactionId: string;
  accountId: string;
  side: LedgerEntrySide;
  amount: number;
}

// Represents the main ledger transaction.
export interface LedgerTransaction {
  eventId: string;
  transactionId: string;
  currency: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// Input received when creating a ledger transaction.
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
