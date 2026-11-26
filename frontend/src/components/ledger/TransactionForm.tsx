import { useRef, useState } from 'react';
import { createTransaction, TransactionError, type SimulateMode } from '../../api/ledger';
import { isMock } from '../../api/mockSession';
import { useAttempts } from '../../context/AttemptsContext';
import { useNotifications } from '../../context/NotificationContext';
import type { CreateLedgerTransactionInput, LedgerEntrySide, SubmitState } from '../../types/ledger';
import { formatMoney, toMinorUnits } from '../../utils/money';
import { validateTransaction } from '../../utils/validateTransaction';

interface Row { id: number; accountId: string; side: LedgerEntrySide; amount: string }
interface Simple { debit: string; credit: string; amount: string }

const CURRENCIES = ['INR', 'USD', 'EUR'];
const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';
const readOnlyClass =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-500';

const short = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
const newIds = () => ({ transactionId: `TXN-${short()}`, eventId: `EVT-${short()}` });
const emptyRows = (): Row[] => [
  { id: 1, accountId: '', side: 'debit', amount: '' },
  { id: 2, accountId: '', side: 'credit', amount: '' },
];

export default function TransactionForm({ onCreated }: { onCreated: () => void }) {
  const { notify } = useNotifications();
  const { record } = useAttempts();

  const [mode, setMode] = useState<'simple' | 'advanced'>('simple');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [simple, setSimple] = useState<Simple>({ debit: '', credit: '', amount: '' });
  const [rows, setRows] = useState<Row[]>(emptyRows);
  const [ids, setIds] = useState(newIds);
  const [simulate, setSimulate] = useState<SimulateMode>('none');
  const [status, setStatus] = useState<SubmitState>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [retryKey, setRetryKey] = useState<string | null>(null);

  const inFlight = useRef(false); // double-click guard
  const nextRowId = useRef(3);

  const entries =
    mode === 'simple'
      ? (() => {
        const amount = toMinorUnits(simple.amount) ?? 0;
        return [
          { accountId: simple.debit.trim(), side: 'debit' as const, amount },
          { accountId: simple.credit.trim(), side: 'credit' as const, amount },
        ];
      })()
      : rows.map((r) => ({ accountId: r.accountId.trim(), side: r.side, amount: toMinorUnits(r.amount) ?? 0 }));

  const sum = (side: LedgerEntrySide) =>
    entries.filter((e) => e.side === side).reduce((s, e) => s + e.amount, 0);
  const debitTotal = sum('debit');
  const creditTotal = sum('credit');
  const balanced = debitTotal === creditTotal && debitTotal > 0;
  const submitting = status === 'submitting';

  // Retry tabhi dikhta hai jab form bilkul wahi hai jo fail hua tha
  const currentKey = JSON.stringify({ description, currency, entries });
  const isRetry = retryKey !== null && retryKey === currentKey;

  const updateRow = (id: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const resetForm = () => {
    setDescription('');
    setSimple({ debit: '', credit: '', amount: '' });
    setRows(emptyRows());
    nextRowId.current = 3;
    setIds(newIds());
  };

  const submit = async () => {
    if (inFlight.current) return;

    // Data wahi hai toh same IDs se retry, data badla hai toh naye IDs
    const reuse = retryKey === currentKey;
    const active = reuse ? ids : newIds();

    const input: CreateLedgerTransactionInput = {
      ...active,
      currency,
      description: description.trim() || undefined,
      entries,
    };

    const problems = validateTransaction(input);
    setErrors(problems);
    if (problems.length > 0) return;

    if (!reuse) setIds(active);
    inFlight.current = true;
    setStatus('submitting');
    setMessage('');

    const base = {
      transactionId: active.transactionId,
      eventId: active.eventId,
      amount: debitTotal,
      currency,
    };

    try {
      const result = await createTransaction(input, { simulate });

      if (result.outcome === 'processing') {
        const text = 'This request is still being processed. Wait a moment and retry. Resubmitting is safe.';
        setRetryKey(currentKey);
        setStatus('processing');
        setMessage(text);
        notify('warning', text);
        record({ ...base, status: 'processing', message: 'Original request is still being processed.' });
        return;
      }

      const duplicate = result.outcome === 'already_processed';
      const text = duplicate
        ? 'Already processed. This request was completed earlier, so no duplicate was created.'
        : `Transaction ${input.transactionId} recorded successfully.`;
      setRetryKey(currentKey);
      setStatus('success');
      setMessage(text);
      notify(duplicate ? 'info' : 'success', text);
      record({
        ...base,
        status: duplicate ? 'duplicate' : 'success',
        message: duplicate ? 'Same Event ID found. No duplicate created.' : 'Saved to the ledger.',
      });
      // Duplicate response ke baad hi form reset hoga
      if (duplicate) {
        setRetryKey(null);
        resetForm();
      }
      onCreated();
    } catch (e) {
      // Local error (request gayi hi nahi) bhi "kuch save nahi hua" hi hai
      const kind = e instanceof TransactionError ? e.kind : 'rolled_back';
      const reason = (e as Error).message;

      setRetryKey(currentKey);
      if (kind === 'rolled_back') {
        const text = `Transaction failed and was rolled back. Nothing was saved. (${reason})`;
        setStatus('failed_rolled_back');
        setMessage(text);
        notify('error', text);
        record({ ...base, status: 'rolled_back', message: reason });
      } else {
        const text = `No confirmation received (${reason}) We cannot tell if it was saved. Retrying is safe: the same Event ID cannot be recorded twice.`;
        setStatus('failed_unknown');
        setMessage(text);
        notify('warning', text);
        record({ ...base, status: 'unknown', message: reason });
      }
      onCreated(); // ledger dobara load karo, taaki asli state dikhe
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <div className="mb-6 space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">New transaction</h3>
        <div className="flex rounded-lg border border-slate-200 p-0.5 text-xs">
          {(['simple', 'advanced'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-md px-3 py-1 capitalize ${mode === m ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-slate-500">
          Transaction ID (auto)
          <input readOnly value={ids.transactionId} className={`${readOnlyClass} mt-1`} />
        </label>
        <label className="text-xs text-slate-500">
          Event ID (auto)
          <input readOnly value={ids.eventId} className={`${readOnlyClass} mt-1`} />
        </label>
      </div>

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

      {mode === 'simple' ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Debit account (e.g. A001)"
            value={simple.debit}
            onChange={(e) => setSimple({ ...simple, debit: e.target.value })}
            className={inputClass}
          />
          <input
            placeholder="Credit account (e.g. A002)"
            value={simple.credit}
            onChange={(e) => setSimple({ ...simple, credit: e.target.value })}
            className={inputClass}
          />
          <input
            inputMode="decimal"
            placeholder="Amount (e.g. 5000.00)"
            value={simple.amount}
            onChange={(e) => setSimple({ ...simple, amount: e.target.value })}
            className={inputClass}
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[1fr_110px_130px_32px] items-center gap-2">
                <input
                  placeholder="Account"
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
                  onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                  disabled={rows.length <= 2}
                  aria-label="Remove entry"
                  className="rounded text-slate-400 hover:text-red-600 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setRows((rs) => [...rs, { id: nextRowId.current++, accountId: '', side: 'debit', amount: '' }])
              }
              className="text-sm text-blue-600 hover:underline"
            >
              + Add entry
            </button>
          </div>

          <div
            className={`flex flex-wrap justify-between gap-2 rounded-lg px-3 py-2 text-sm ${balanced ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              }`}
          >
            <span>Debits: {formatMoney(debitTotal, currency)}</span>
            <span>Credits: {formatMoney(creditTotal, currency)}</span>
            <span className="font-medium">{balanced ? 'Balanced' : 'Not balanced'}</span>
          </div>
        </>
      )}

      {errors.length > 0 && (
        <ul className="list-disc space-y-1 rounded-lg bg-red-50 py-2 pl-8 pr-3 text-sm text-red-600">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      {status === 'success' && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>
      )}
      {status === 'processing' && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{message}</p>
      )}
      {status === 'failed_rolled_back' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <p className="font-medium">Rolled back</p>
          <p className="mt-1">{message}</p>
          <p className="mt-1 text-xs">You can fix the problem and retry. Nothing was recorded.</p>
        </div>
      )}
      {status === 'failed_unknown' && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
          <p className="font-medium">Outcome unconfirmed</p>
          <p className="mt-1">{message}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        {isMock() ? (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Demo:
            <select
              value={simulate}
              onChange={(e) => setSimulate(e.target.value as SimulateMode)}
              className="rounded border border-slate-300 px-2 py-1"
            >
              <option value="none">Normal</option>
              <option value="rollback">Server error (rolled back)</option>
              <option value="timeout">Timeout, not saved</option>
              <option value="timeout_saved">Timeout, but saved (response lost)</option>
              <option value="processing">Duplicate still processing</option>
            </select>
          </label>
        ) : (
          <span />
        )}
        <button
          onClick={submit}
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Processing...' : isRetry ? 'Retry (same request)' : 'Submit transaction'}
        </button>
      </div>
    </div>
  );
}