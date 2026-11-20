import { get, post } from './client';
import type { CreateLedgerTransactionInput, LedgerTransaction } from '../types/ledger';

const useMock = () => import.meta.env.VITE_USE_MOCK === 'true';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// In-memory mock "database" (page refresh par reset ho jata hai)
const mockStore: LedgerTransaction[] = [
  {
    eventId: 'evt_001',
    transactionId: 'txn_001',
    currency: 'INR',
    description: 'Monthly subscription - Pro plan',
    createdAt: '2026-11-17T09:30:00.000Z',
    entries: [
      { transactionId: 'txn_001', accountId: 'customer_receivable', side: 'debit', amount: 499900 },
      { transactionId: 'txn_001', accountId: 'subscription_revenue', side: 'credit', amount: 499900 },
    ],
  },
  {
    eventId: 'evt_002',
    transactionId: 'txn_002',
    currency: 'INR',
    description: 'API usage overage - October',
    createdAt: '2026-11-18T14:10:00.000Z',
    entries: [
      { transactionId: 'txn_002', accountId: 'customer_receivable', side: 'debit', amount: 125050 },
      { transactionId: 'txn_002', accountId: 'usage_revenue', side: 'credit', amount: 125050 },
    ],
  },
];

export async function listTransactions(): Promise<LedgerTransaction[]> {
  if (useMock()) {
    await wait(300);
    return [...mockStore].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
  return get<LedgerTransaction[]>('/ledger'); // route abhi backend mein nahi hai
}

export interface CreateResult {
  transaction: LedgerTransaction;
  duplicate: boolean; // true = ye eventId pehle se process ho chuka tha
}

export async function createTransaction(
  input: CreateLedgerTransactionInput,
  opts?: { simulateTimeout?: boolean }
): Promise<CreateResult> {
  if (useMock()) {
    await wait(900);

    // Idempotency: same eventId dobara aaye toh original return karo, naya mat banao
    const existing = mockStore.find((t) => t.eventId === input.eventId);
    if (existing) return { transaction: existing, duplicate: true };

    // Timeout simulation: kuch save nahi hota (rollback)
    if (opts?.simulateTimeout) {
      throw new Error('Network timeout. The transaction was rolled back and nothing was saved.');
    }

    const now = new Date().toISOString();
    const transaction: LedgerTransaction = {
      eventId: input.eventId,
      transactionId: input.transactionId,
      currency: input.currency,
      description: input.description,
      createdAt: now,
      updatedAt: now,
      entries: input.entries.map((e) => ({ ...e, transactionId: input.transactionId })),
    };
    mockStore.push(transaction);
    return { transaction, duplicate: false };
  }

  // Real mode: route aur duplicate (409) handling Sanjana se confirm karke update karna
  const transaction = await post<LedgerTransaction>('/ledger', input);
  return { transaction, duplicate: false };
}