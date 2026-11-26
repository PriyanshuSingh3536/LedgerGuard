import { ApiError, get, post } from './client';
import { endpoints, requireEndpoint } from './endpoints';
import { getMockOrg, isMock } from './mockSession';
import type {
  CreateLedgerTransactionInput,
  LedgerEntry,
  LedgerEntrySide,
  LedgerTransaction,
} from '../types/ledger';

export type SimulateMode = 'none' | 'rollback' | 'timeout' | 'timeout_saved' | 'processing';
export type FailureKind = 'rolled_back' | 'unknown';

export class TransactionError extends Error {
  kind: FailureKind;

  constructor(message: string, kind: FailureKind) {
    super(message);
    this.name = 'TransactionError';
    this.kind = kind;
  }
}
export type CreateOutcome = 'created' | 'already_processed' | 'processing';

export interface CreateResult {
  outcome: CreateOutcome;
  transaction?: LedgerTransaction;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const entry = (transactionId: string, accountId: string, side: LedgerEntrySide, amount: number): LedgerEntry => ({
  transactionId, accountId, side, amount,
});

// Har organization ka alag mock data (tenant isolation demo)
function seed(org: string): LedgerTransaction[] {
  if (org === 'company-b') {
    return [
      {
        eventId: 'evt_b01', transactionId: 'txn_b01', currency: 'INR',
        description: 'Enterprise licence - annual', createdAt: '2026-11-15T11:00:00.000Z',
        entries: [
          entry('txn_b01', 'customer_receivable', 'debit', 1200000),
          entry('txn_b01', 'license_revenue', 'credit', 1200000),
        ],
      },
    ];
  }
  return [
    {
      eventId: 'evt_001', transactionId: 'txn_001', currency: 'INR',
      description: 'Monthly subscription - Pro plan', createdAt: '2026-11-17T09:30:00.000Z',
      entries: [
        entry('txn_001', 'customer_receivable', 'debit', 499900),
        entry('txn_001', 'subscription_revenue', 'credit', 499900),
      ],
    },
    {
      eventId: 'evt_002', transactionId: 'txn_002', currency: 'INR',
      description: 'API usage overage - October', createdAt: '2026-11-18T14:10:00.000Z',
      entries: [
        entry('txn_002', 'customer_receivable', 'debit', 125050),
        entry('txn_002', 'usage_revenue', 'credit', 125050),
      ],
    },
    {
      eventId: 'evt_003', transactionId: 'txn_003', currency: 'USD',
      description: 'Support add-on', createdAt: '2026-11-20T08:45:00.000Z',
      entries: [
        entry('txn_003', 'customer_receivable', 'debit', 2500),
        entry('txn_003', 'support_revenue', 'credit', 2500),
      ],
    },
  ];
}

const stores: Record<string, LedgerTransaction[]> = {};
function store(): LedgerTransaction[] {
  const org = getMockOrg();
  if (!stores[org]) stores[org] = seed(org);
  return stores[org];
}

export async function listTransactions(): Promise<LedgerTransaction[]> {
  if (isMock()) {
    await wait(300);
    return [...store()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }
  return get<LedgerTransaction[]>(requireEndpoint(endpoints.ledger.list, 'Transaction list'));
}

export async function getTransaction(transactionId: string): Promise<LedgerTransaction> {
  if (isMock()) {
    await wait(250);
    const found = store().find((t) => t.transactionId === transactionId);
    if (!found) throw new Error('Transaction not found.');
    return found;
  }
  const build = endpoints.ledger.detail;
  if (!build) throw new Error('The Transaction details API is not available on the backend yet.');
  return get<LedgerTransaction>(build(transactionId));
}

export async function createTransaction(
  input: CreateLedgerTransactionInput,
  opts?: { simulate?: SimulateMode }
): Promise<CreateResult> {
  if (isMock()) {
    await wait(900);

    // Check if event is already processed
    const existing = store().find((t) => t.eventId === input.eventId);

    if (existing) {
      return { outcome: 'already_processed', transaction: existing };
    }

    const mode = opts?.simulate ?? 'none';

    if (mode === 'processing') {
      return { outcome: 'processing' };
    }

    // Database rollback
    if (mode === 'rollback') {
      throw new TransactionError(
        'Database write failed on the server.',
        'rolled_back'
      );
    }

    // Request timeout
    if (mode === 'timeout') {
      throw new TransactionError(
        'The request timed out.',
        'unknown'
      );
    }

    const now = new Date().toISOString();

    const transaction: LedgerTransaction = {
      eventId: input.eventId,
      transactionId: input.transactionId,
      currency: input.currency,
      description: input.description,
      createdAt: now,
      updatedAt: now,
      entries: input.entries.map((e) => ({
        ...e,
        transactionId: input.transactionId,
      })),
    };

    store().push(transaction);

    // Transaction saved, but response lost
    if (mode === 'timeout_saved') {
      throw new TransactionError(
        'The request timed out.',
        'unknown'
      );
    }

    return { outcome: 'created', transaction };
  }

  const path = requireEndpoint(
    endpoints.ledger.create,
    'Create transaction'
  );

  try {
    // TODO: Confirm backend duplicate and processing responses
    const transaction = await post<LedgerTransaction>(path, input);

    return { outcome: 'created', transaction };
  } catch (e) {
    // Server responded with an HTTP error
    if (e instanceof ApiError && e.status !== undefined) {
      throw new TransactionError(e.message, 'rolled_back');
    }

    // No response received
    throw new TransactionError(
      'No response from the server.',
      'unknown'
    );
  }
}