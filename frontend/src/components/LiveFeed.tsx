import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import type { TransactionUpdate, TxStatus } from '../types/socket';
import { formatMoney } from '../utils/money';

const badge: Record<TxStatus, string> = {
  success: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  rolled_back: 'bg-amber-100 text-amber-700',
};

const label: Record<TxStatus, string> = {
  success: 'Success',
  failed: 'Failed',
  rolled_back: 'Rolled back',
};

export default function LiveFeed() {
  const { subscribe, status } = useSocket();
  const [events, setEvents] = useState<TransactionUpdate[]>([]);

  useEffect(
    () => subscribe('transaction:update', (e) => setEvents((prev) => [e, ...prev].slice(0, 8))),
    [subscribe]
  );

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h3 className="mb-3 font-medium">Live activity</h3>

      {events.length === 0 ? (
        <p className="text-sm text-slate-500">
          {status === 'live'
            ? 'Waiting for transactions...'
            : status === 'disabled'
              ? 'Live updates are not available yet. The backend has no real-time feed.'
              : 'Not connected.'}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {events.map((e) => (
            <li key={e.transactionId} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="font-mono text-xs text-slate-500">{e.transactionId}</span>
              <span className="font-medium">{formatMoney(e.amount, e.currency)}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-medium ${badge[e.status]}`}>
                {label[e.status]}
              </span>
              <span className="hidden text-xs text-slate-400 sm:inline">
                {new Date(e.createdAt).toLocaleTimeString('en-IN')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}