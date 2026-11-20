import { useState } from 'react';
import type { LedgerTransaction } from '../../types/ledger';
import { formatMoney } from '../../utils/money';

function formatDate(iso?: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function LedgerTable({ transactions }: { transactions: LedgerTransaction[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return <p className="rounded-xl bg-white p-6 text-slate-500 shadow-sm">No transactions yet.</p>;
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
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const open = openId === t.transactionId;
            const total = (t.entries ?? [])
              .filter((e) => e.side === 'debit')
              .reduce((s, e) => s + e.amount, 0);

            return (
              <FragmentRow key={t.transactionId}>
                <tr
                  onClick={() => setOpenId(open ? null : t.transactionId)}
                  className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-400">{open ? '▾' : '▸'}</td>
                  <td className="px-4 py-3 font-mono text-xs">{t.transactionId}</td>
                  <td className="px-4 py-3">{t.description || <span className="text-slate-400">No description</span>}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {t.entries ? formatMoney(total, t.currency) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(t.createdAt)}</td>
                </tr>

                {open && (
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <td />
                    <td colSpan={4} className="px-4 py-3">
                      <p className="mb-2 text-xs text-slate-500">
                        Event ID: <span className="font-mono">{t.eventId}</span>
                      </p>
                      {t.entries && t.entries.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-1 text-left font-medium">Account</th>
                              <th className="py-1 text-left font-medium">Side</th>
                              <th className="py-1 text-right font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {t.entries.map((e, i) => (
                              <tr key={i} className="border-t border-slate-200">
                                <td className="py-1.5 font-mono">{e.accountId}</td>
                                <td className="py-1.5">
                                  <span
                                    className={`rounded px-2 py-0.5 font-medium ${
                                      e.side === 'debit'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {e.side}
                                  </span>
                                </td>
                                <td className="py-1.5 text-right">{formatMoney(e.amount, t.currency)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-xs text-slate-500">Entries are not available for this transaction.</p>
                      )}
                    </td>
                  </tr>
                )}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// key lagane ke liye chhota wrapper (Fragment)
import { Fragment, type ReactNode } from 'react';
function FragmentRow({ children }: { children: ReactNode }) {
  return <Fragment>{children}</Fragment>;
}