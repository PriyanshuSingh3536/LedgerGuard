import { useAttempts } from '../../context/AttemptsContext';
import type { AttemptStatus } from '../../types/ledger';
import { formatMoney } from '../../utils/money';

const badge: Record<AttemptStatus, string> = {
  success: 'bg-green-100 text-green-700',
  duplicate: 'bg-blue-100 text-blue-700',
  processing: 'bg-amber-100 text-amber-700',
  rolled_back: 'bg-red-100 text-red-700',
  unknown: 'bg-orange-100 text-orange-700',
};

const label: Record<AttemptStatus, string> = {
  success: 'Saved',
  duplicate: 'Already processed',
  processing: 'Processing',
  rolled_back: 'Rolled back',
  unknown: 'Unconfirmed',
};

export default function AttemptLog({ ledgerCount }: { ledgerCount: number }) {
  const { attempts, clear } = useAttempts();
  const count = (s: AttemptStatus) => attempts.filter((a) => a.status === s).length;

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Submission attempts (this session)</h3>
        {attempts.length > 0 && (
          <button onClick={clear} className="text-xs text-slate-500 hover:underline">Clear</button>
        )}
      </div>

      <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Ledger records: <b>{ledgerCount}</b> · Saved: <b>{count('success')}</b> · Rolled back:{' '}
        <b>{count('rolled_back')}</b> · Unconfirmed: <b>{count('unknown')}</b>. Rolled-back attempts never
        appear in the ledger because nothing was saved.
      </p>

      {attempts.length === 0 ? (
        <p className="text-sm text-slate-500">No attempts yet. Submit a transaction to see its outcome here.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 font-medium">Time</th>
                <th className="py-2 font-medium">Event ID</th>
                <th className="py-2 text-right font-medium">Amount</th>
                <th className="py-2 pl-4 font-medium">Outcome</th>
                <th className="py-2 font-medium">Detail</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 text-slate-500">{new Date(a.at).toLocaleTimeString('en-IN')}</td>
                  <td className="py-2 font-mono">{a.eventId}</td>
                  <td className="py-2 text-right">{formatMoney(a.amount, a.currency)}</td>
                  <td className="py-2 pl-4">
                    <span className={`rounded px-2 py-0.5 font-medium ${badge[a.status]}`}>{label[a.status]}</span>
                  </td>
                  <td className="py-2 text-slate-600">{a.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}