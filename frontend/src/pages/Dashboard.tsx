import { useState } from 'react';
import { useUsageData } from '../hooks/useUsageData';
import { TransactionsLine, RevenueBar } from '../components/charts/UsageCharts';
import { formatMoney } from '../utils/money';

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
  const { data, loading, error } = useUsageData(days);

  const totalTx = data.reduce((s, d) => s + d.transactions, 0);
  const totalAmount = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Dashboard</h2>
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

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && data.length === 0 && (
        <p className="text-slate-500">No data for this period.</p>
      )}

      {!loading && !error && data.length > 0 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Transactions" value={totalTx} />
            <StatCard label="Total amount" value={formatMoney(totalAmount)} />
            <StatCard label="Daily average" value={Math.round(totalTx / data.length)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-medium">Transactions per day</h3>
              <TransactionsLine data={data} />
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="mb-3 font-medium">Amount per day (INR)</h3>
              <RevenueBar data={data} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}