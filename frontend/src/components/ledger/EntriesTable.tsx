import type { LedgerEntry } from '../../types/ledger';
import { formatMoney } from '../../utils/money';

export default function EntriesTable({ entries, currency }: { entries?: LedgerEntry[]; currency: string }) {
  if (!entries || entries.length === 0) {
    return <p className="text-xs text-slate-500">Entries are not available for this transaction.</p>;
  }

  return (
    <table className="w-full text-xs">
      <thead className="text-slate-500">
        <tr>
          <th className="py-1 text-left font-medium">Account</th>
          <th className="py-1 text-left font-medium">Side</th>
          <th className="py-1 text-right font-medium">Amount</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, i) => (
          <tr key={i} className="border-t border-slate-200">
            <td className="py-1.5 font-mono">{e.accountId}</td>
            <td className="py-1.5">
              <span
                className={`rounded px-2 py-0.5 font-medium ${
                  e.side === 'debit' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}
              >
                {e.side}
              </span>
            </td>
            <td className="py-1.5 text-right">{formatMoney(e.amount, currency)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}