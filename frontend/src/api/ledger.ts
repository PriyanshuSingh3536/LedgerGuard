import { ApiError, get, getBody, post } from './client';
import { endpoints } from './endpoints';
import { getMockOrg, isMock } from './mockSession';
import type {
  CreateLedgerTransactionInput,
  LedgerEntry,
  LedgerEntrySide,
  LedgerPage,
  LedgerTransaction,
  Pagination,
} from '../types/ledger';

export type SimulateMode = 'none' | 'rollback' | 'timeout' | 'timeout_saved' | 'processing';
export type FailureKind = 'rolled_back' | 'unknown';
export type CreateOutcome = 'created' | 'already_processed' | 'processing';

export class TransactionError extends Error {
  kind: FailureKind;
  constructor(message: string, kind: FailureKind) {
    super(message);
    this.kind = kind;
  }
}

export interface CreateResult {
  outcome: CreateOutcome;
  transaction?: LedgerTransaction;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const entry = (transactionId: string, accountId: string, side: LedgerEntrySide, amount: number): LedgerEntry => ({
  transactionId, accountId, side, amount,
});

// ---------- Mock data (har organization ka alag) ----------
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

// ---------- Real response ko parse karna ----------
function parseLedgerPage(body: unknown, page: number, limit: number): LedgerPage {
  const root = (body ?? {}) as Record<string, unknown>;
  const data = root.data ?? root;
  let list: unknown = [];
  let pag: unknown = root.pagination;

  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    list = d.transactions ?? [];
    pag = d.pagination ?? pag;
  }

  const transactions = Array.isArray(list) ? (list as LedgerTransaction[]) : [];
  const p = (pag ?? {}) as Partial<Pagination>;
  return {
    transactions,
    pagination: {
      currentPage: p.currentPage ?? page,
      pageSize: p.pageSize ?? limit,
      totalRecords: p.totalRecords ?? transactions.length,
      totalPages: p.totalPages ?? 1,
    },
  };
}

// ---------- List ----------
export async function listTransactions(page = 1, limit = 10): Promise<LedgerPage> {
  if (isMock()) {
    await wait(300);
    const sorted = [...store()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    const totalRecords = sorted.length;
    const start = (page - 1) * limit;
    return {
      transactions: sorted.slice(start, start + limit),
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalRecords,
        totalPages: Math.max(1, Math.ceil(totalRecords / limit)),
      },
    };
  }
  const body = await getBody(endpoints.ledger.list, { page, limit });
  return parseLedgerPage(body, page, limit);
}

// ---------- Detail ----------
export async function getTransaction(transactionId: string): Promise<LedgerTransaction> {
  if (isMock()) {
    await wait(250);
    const found = store().find((t) => t.transactionId === transactionId);
    if (!found) throw new Error('Transaction not found.');
    return found;
  }

  const build = endpoints.ledger.detail;
  if (build) return get<LedgerTransaction>(build(transactionId));

  // Detail API nahi hai, isliye latest 100 records mein se dhoondhte hain
  const { transactions } = await listTransactions(1, 100);
  const found = transactions.find((t) => t.transactionId === transactionId);
  if (!found) throw new Error('Transaction not found in the latest 100 records.');
  return found;
}

// ---------- Create ----------
// TODO: Sanjana se duplicate ke exact status code aur message confirm karo, phir yahan badlo
function mapDuplicate(e: ApiError): CreateResult | null {
  if (e.status !== 409) return null;
  const msg = e.message.toLowerCase();
  if (/process|progress|lock/.test(msg)) return { outcome: 'processing' };
  if (/already|duplicate|complet|exist/.test(msg)) return { outcome: 'already_processed' };
  return null;
}

export async function createTransaction(
  input: CreateLedgerTransactionInput,
  opts?: { simulate?: SimulateMode }
): Promise<CreateResult> {
  if (isMock()) {
    await wait(900);

    const existing = store().find((t) => t.eventId === input.eventId);
    if (existing) return { outcome: 'already_processed', transaction: existing };

    const mode = opts?.simulate ?? 'none';
    if (mode === 'processing') return { outcome: 'processing' };
    if (mode === 'rollback') throw new TransactionError('Database write failed on the server.', 'rolled_back');
    if (mode === 'timeout') throw new TransactionError('The request timed out.', 'unknown');

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
    store().push(transaction);

    if (mode === 'timeout_saved') throw new TransactionError('The request timed out.', 'unknown');
    return { outcome: 'created', transaction };
  }

  try {
    const transaction = await post<LedgerTransaction>(endpoints.ledger.create, input);
    return { outcome: 'created', transaction };
  } catch (e) {
    if (e instanceof ApiError && e.status !== undefined) {
      const duplicate = mapDuplicate(e);
      if (duplicate) return duplicate;
      // Server ne error response diya = transaction atomic hai, to rolled back
      throw new TransactionError(e.message, 'rolled_back');
    }
    // Koi response nahi (timeout ya network gaya) = outcome pata nahi
    throw new TransactionError(e instanceof Error ? e.message : 'No response from the server.', 'unknown');
  }
}