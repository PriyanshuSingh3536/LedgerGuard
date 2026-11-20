import { useEffect, useState } from 'react';
import { getUsage } from '../api/usage';
import type { UsagePoint } from '../types';

export function useUsageData(days: number) {
  const [data, setData] = useState<UsagePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return { data, loading, error };
}