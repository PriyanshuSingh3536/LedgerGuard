import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTransaction } from '../api/ledger';
import EntriesTable from '../components/ledger/EntriesTable';
import type { LedgerTransaction } from '../types/ledger';
import { formatDateTime } from '../utils/format';
import { formatMoney } from '../utils/money';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export default function TransactionDetail() {
  const { transactionId = '' } = useParams();
  const [tx, setTx] = useState<LedgerTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    getTransaction(transactionId)
      .then((t) => { if (!cancelled) setTx(t); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [transactionId]);

  const sum = (side: 'debit' | 'credit') =>
    (tx?.entries ?? []).filter((e) => e.side === side).reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <Link to="/ledger" className="text-sm text-blue-600 hover:underline">← Back to ledger</Link>
      <h2 className="mb-4 mt-2 text-xl font-semibold">Transaction details</h2>

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

      {tx && (
        <div className="space-y-4">
          <dl className="grid gap-4 rounded-xl bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Transaction ID"><span className="font-mono text-xs">{tx.transactionId}</span></Field>
            <Field label="Event ID"><span className="font-mono text-xs">{tx.eventId}</span></Field>
            <Field label="Currency">{tx.currency}</Field>
            <Field label="Description">{tx.description || <span className="text-slate-400">None</span>}</Field>
            <Field label="Created">{formatDateTime(tx.createdAt)}</Field>
            <Field label="Updated">{formatDateTime(tx.updatedAt)}</Field>
          </dl>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-medium">Ledger entries</h3>
            <EntriesTable entries={tx.entries} currency={tx.currency} />
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-200 pt-3 text-sm">
              <span>Total debit: <b>{formatMoney(sum('debit'), tx.currency)}</b></span>
              <span>Total credit: <b>{formatMoney(sum('credit'), tx.currency)}</b></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}