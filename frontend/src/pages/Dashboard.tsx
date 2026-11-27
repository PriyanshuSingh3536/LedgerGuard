import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LiveFeed from '../components/LiveFeed';
import { TransactionsLine, RevenueBar } from '../components/charts/UsageCharts';
import { useLedger } from '../hooks/useLedger';
import { useUsageData } from '../hooks/useUsageData';
import { formatDateTime } from '../utils/format';
import { formatMoney } from '../utils/money';
import { summarizeByCurrency, transactionTotal } from '../utils/summarize';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const [days, setDays] = useState(7);
  const ledger = useLedger(1, 100);
  const usage = useUsageData(days);

  const summary = useMemo(() => summarizeByCurrency(ledger.transactions), [ledger.transactions]);
  const recent = ledger.transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Dashboard</h2>

      {/* Ledger summary */}
      {ledger.loading && <p className="text-slate-500">Loading...</p>}
      {ledger.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{ledger.error}</p>
      )}

      {!ledger.loading && !ledger.error && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="Total transactions" value={ledger.pagination.totalRecords} />
            <StatCard label="Currencies" value={summary.length} />
            <StatCard label="Last activity" value={formatDateTime(recent[0]?.createdAt)} />
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-medium">Debit and credit summary</h3>
            <p className="mb-3 text-xs text-slate-500">Based on the latest {ledger.transactions.length} transactions.</p>
            {summary.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-500">
                    <tr>
                      <th className="py-2 font-medium">Currency</th>
                      <th className="py-2 text-right font-medium">Transactions</th>
                      <th className="py-2 text-right font-medium">Total debit</th>
                      <th className="py-2 text-right font-medium">Total credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s) => (
                      <tr key={s.currency} className="border-b border-slate-100">
                        <td className="py-2 font-medium">{s.currency}</td>
                        <td className="py-2 text-right">{s.count}</td>
                        <td className="py-2 text-right">{formatMoney(s.debit, s.currency)}</td>
                        <td className="py-2 text-right">{formatMoney(s.credit, s.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Recent transactions</h3>
              <Link to="/ledger" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-sm text-slate-500">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((t) => (
                  <li key={t.transactionId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <Link
                      to={`/ledger/${encodeURIComponent(t.transactionId)}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      {t.transactionId}
                    </Link>
                    <span className="min-w-0 flex-1 truncate text-slate-600">{t.description}</span>
                    <span className="font-medium">{formatMoney(transactionTotal(t), t.currency)}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(t.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {/* Usage trends + live feed */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium">Usage trends</h3>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {usage.loading && <p className="text-slate-500">Loading...</p>}
        {usage.error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">{usage.error}</p>}

        {!usage.loading && !usage.error && usage.data.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h4 className="mb-3 text-sm font-medium">Transactions per day</h4>
              <TransactionsLine data={usage.data} />
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h4 className="mb-3 text-sm font-medium">Amount per day (INR)</h4>
              <RevenueBar data={usage.data} />
            </div>
          </div>
        )}

        <div className="mt-4">
          <LiveFeed />
        </div>
      </div>
    </div>
  );
}