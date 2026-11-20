import { useRef, useState } from 'react';
import { createTransaction } from '../../api/ledger';
import type { LedgerEntrySide, SubmitState } from '../../types/ledger';
import { formatMoney, toMinorUnits } from '../../utils/money';
import { validateTransaction } from '../../utils/validateTransaction';

interface Row { id: number; accountId: string; side: LedgerEntrySide; amount: string }

const CURRENCIES = ['INR', 'USD', 'EUR'];
const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const newIds = () => ({ eventId: crypto.randomUUID(), transactionId: crypto.randomUUID() });
const emptyRows = (): Row[] => [
  { id: 1, accountId: '', side: 'debit', amount: '' },
  { id: 2, accountId: '', side: 'credit', amount: '' },
];

export default function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [simulate, setSimulate] = useState(false);
  const [status, setStatus] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  // Same IDs retry par reuse hote hain (duplicate charge se bachne ke liye)
  const ids = useRef(newIds());
  const lastFailedPayload = useRef<string | null>(null);
  const nextRowId = useRef(3);

  const minor = (r: Row) => toMinorUnits(r.amount) ?? 0;
  const debitTotal = rows.filter((r) => r.side === 'debit').reduce((s, r) => s + minor(r), 0);
  const creditTotal = rows.filter((r) => r.side === 'credit').reduce((s, r) => s + minor(r), 0);
  const balanced = debitTotal === creditTotal && debitTotal > 0;
  const submitting = status === 'submitting';

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const addRow = () =>
    setRows((rs) => [...rs, { id: nextRowId.current++, accountId: '', side: 'debit', amount: '' }]);

  const removeRow = (id: number) => setRows((rs) => rs.filter((r) => r.id !== id));

  const submit = async () => {
    if (submitting) return;

    const entries = rows.map((r) => ({
      accountId: r.accountId.trim(),
      side: r.side,
      amount: minor(r),
    }));

    // Agar user ne failure ke baad data badla hai, toh naye IDs; warna same IDs se retry
    const payloadKey = JSON.stringify({ description, currency, entries });
    if (lastFailedPayload.current !== payloadKey) ids.current = newIds();

    const input = {
      ...ids.current,
      currency,
      description: description.trim() || undefined,
      entries,
    };

    const problems = validateTransaction(input);
    setErrors(problems);
    if (problems.length > 0) return;

    setStatus('submitting');
    setMessage('');
    try {
      const result = await createTransaction(input, { simulateTimeout: simulate });
      lastFailedPayload.current = null;
      ids.current = newIds();
      setStatus('success');
      setMessage(
        result.duplicate
          ? 'Already processed. This request was received before, so no duplicate was created.'
          : 'Transaction recorded successfully.'
      );
      setDescription('');
      setRows(emptyRows());
      nextRowId.current = 3;
      onCreated();
    } catch (e) {
      lastFailedPayload.current = payloadKey;
      setStatus('failed_rolled_back');
      setMessage((e as Error).message);
    }
  };

  return (
    <div className="mb-6 space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <h3 className="font-medium">New transaction</h3>

      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div>
          <input
            placeholder="Description (optional)"
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-right text-xs text-slate-400">{description.length}/500</p>
        </div>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
          {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="grid grid-cols-[1fr_110px_130px_32px] items-center gap-2">
            <input
              placeholder="Account (e.g. customer_receivable)"
              value={r.accountId}
              onChange={(e) => updateRow(r.id, { accountId: e.target.value })}
              className={inputClass}
            />
            <select
              value={r.side}
              onChange={(e) => updateRow(r.id, { side: e.target.value as LedgerEntrySide })}
              className={inputClass}
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={r.amount}
              onChange={(e) => updateRow(r.id, { amount: e.target.value })}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => removeRow(r.id)}
              disabled={rows.length <= 2}
              aria-label="Remove entry"
              className="rounded text-slate-400 hover:text-red-600 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={addRow} className="text-sm text-blue-600 hover:underline">
          + Add entry
        </button>
      </div>

      <div
        className={`flex flex-wrap justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
          balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        <span>Debits: {formatMoney(debitTotal, currency)}</span>
        <span>Credits: {formatMoney(creditTotal, currency)}</span>
        <span className="font-medium">{balanced ? 'Balanced' : 'Not balanced'}</span>
      </div>

      {errors.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-red-50 py-2 pl-8 pr-3 text-sm text-red-600">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      {status === 'success' && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {status === 'failed_rolled_back' && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">{message}</p>
          <p className="mt-1">You can retry safely. The same request ID is reused, so you won't be charged twice.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} />
          Simulate network timeout (demo only)
        </label>
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Processing...' : status === 'failed_rolled_back' ? 'Retry' : 'Submit transaction'}
        </button>
      </div>
    </div>
  );
}