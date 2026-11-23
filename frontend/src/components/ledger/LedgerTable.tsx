import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import type { LedgerTransaction } from '../../types/ledger';
import { formatDateTime } from '../../utils/format';
import { formatMoney } from '../../utils/money';
import { transactionTotal } from '../../utils/summarize';
import EntriesTable from './EntriesTable';

export default function LedgerTable({ transactions }: { transactions: LedgerTransaction[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">No transactions found.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
          <tr>
            <th className="w-10 px-4 py-3" />
            <th className="px-4 py-3 font-medium">Transaction</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 text-right font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const open = openId === t.transactionId;
            return (
              <Fragment key={t.transactionId}>
                <tr
                  onClick={() => setOpenId(open ? null : t.transactionId)}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-400">{open ? '▾' : '▸'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.transactionId}</td>
                  <td className="px-4 py-3">
                    {t.description || <span className="text-slate-400">No description</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {t.entries ? formatMoney(transactionTotal(t), t.currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDateTime(t.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/ledger/${encodeURIComponent(t.transactionId)}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-600 hover:underline"
                    >
                      Details
                    </Link>
                  </td>
                </tr>

                {open && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td />
                    <td colSpan={5} className="px-4 py-3">
                      <p className="mb-2 text-xs text-slate-500">
                        Event ID: <span className="font-mono">{t.eventId}</span>
                      </p>
                      <EntriesTable entries={t.entries} currency={t.currency} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}