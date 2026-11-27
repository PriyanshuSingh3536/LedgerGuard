import { useMemo, useState } from 'react';
import { useLedger } from '../hooks/useLedger';
import AttemptLog from '../components/ledger/AttemptLog';
import LedgerTable from '../components/ledger/LedgerTable';
import TransactionForm from '../components/ledger/TransactionForm';

const PAGE_SIZE = 10;

export default function Ledger() {
  const [page, setPage] = useState(1);
  const { transactions, pagination, loading, error, reload } = useLedger(page, PAGE_SIZE);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState('');
  const [currency, setCurrency] = useState('ALL');

  const currencies = useMemo(
    () => Array.from(new Set(transactions.map((t) => t.currency))).sort(),
    [transactions]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (currency !== 'ALL' && t.currency !== currency) return false;
      if (!q) return true;
      const haystack = [t.transactionId, t.eventId, t.description ?? '', ...(t.entries ?? []).map((e) => e.accountId)];
      return haystack.some((s) => s.toLowerCase().includes(q));
    });
  }, [transactions, query, currency]);

  // Naya transaction page 1 par dikhta hai
  const handleCreated = () => {
    if (page !== 1) setPage(1);
    else void reload();
  };

  const pagerButton =
    'rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ledger</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Close' : '+ New transaction'}
        </button>
      </div>

      {showForm && <TransactionForm onCreated={handleCreated} />}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search this page by ID, description or account"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full max-w-sm rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="ALL">All currencies</option>
          {currencies.map((c) => <option key={c}>{c}</option>)}
        </select>
        {!loading && !error && (
          <span className="text-sm text-slate-500">
            Showing {filtered.length} of {transactions.length} on this page
          </span>
        )}
      </div>

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {!loading && !error && <LedgerTable transactions={filtered} />}

      {!error && pagination.totalRecords > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <span>
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalRecords} records
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading} className={pagerButton}>
              Previous
            </button>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages || loading}
              className={pagerButton}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <AttemptLog ledgerCount={pagination.totalRecords} />
      </div>
    </div>
  );
}