import type { LedgerTransaction } from '../types/ledger';

export interface CurrencySummary {
  currency: string;
  count: number;
  debit: number;
  credit: number;
}

export function transactionTotal(t: LedgerTransaction): number {
  return (t.entries ?? []).filter((e) => e.side === 'debit').reduce((s, e) => s + e.amount, 0);
}

export function summarizeByCurrency(transactions: LedgerTransaction[]): CurrencySummary[] {
  const map = new Map<string, CurrencySummary>();
  for (const t of transactions) {
    const row = map.get(t.currency) ?? { currency: t.currency, count: 0, debit: 0, credit: 0 };
    row.count += 1;
    for (const e of t.entries ?? []) {
      if (e.side === 'debit') row.debit += e.amount;
      else row.credit += e.amount;
    }
    map.set(t.currency, row);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}