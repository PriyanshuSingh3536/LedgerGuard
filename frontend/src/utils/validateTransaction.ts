import type { CreateLedgerTransactionInput } from '../types/ledger';

export function validateTransaction(t: CreateLedgerTransactionInput): string[] {
  const errors: string[] = [];

  if (!/^[A-Z]{3}$/.test(t.currency)) errors.push('Currency must be a 3-letter code.');
  if ((t.description?.length ?? 0) > 500) errors.push('Description is too long (max 500).');
  if (t.entries.length < 2) errors.push('Add at least two entries (one debit, one credit).');

  for (const e of t.entries) {
    if (!e.accountId) errors.push('Every entry needs an account.');
    if (!Number.isSafeInteger(e.amount) || e.amount < 1) errors.push('Every amount must be a valid positive number.');
  }

  const sum = (side: 'debit' | 'credit') =>
    t.entries.filter((e) => e.side === side).reduce((s, e) => s + e.amount, 0);
  if (sum('debit') !== sum('credit')) errors.push('Total debits must equal total credits.');

  return Array.from(new Set(errors)); // duplicate messages hata do
}