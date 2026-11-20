import { useEffect, useState } from 'react';
import { getUsage } from '../api/usage';
import { useSocket } from '../context/SocketContext';
import type { UsagePoint } from '../types';

export function useUsageData(days: number) {
  const { subscribe } = useSocket();
  const [data, setData] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Initial history load
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getUsage(days)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  // Live updates: aaj ke point mein add karo, ya naya din jodo
  useEffect(
    () =>
      subscribe('usage:update', (u) =>
        setData((prev) => {
          if (prev.length === 0) return prev;
          const i = prev.findIndex((p) => p.date === u.date);
          if (i >= 0) {
            const next = [...prev];
            next[i] = {
              ...next[i],
              transactions: next[i].transactions + u.transactions,
              amount: next[i].amount + u.amount,
            };
            return next;
          }
          return [...prev, { ...u }].slice(-days);
        })
      ),
    [subscribe, days]
  );

  return { data, loading, error };
}