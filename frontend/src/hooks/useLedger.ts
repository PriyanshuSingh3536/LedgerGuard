import { useCallback, useEffect, useState } from 'react';
import { listTransactions } from '../api/ledger';
import type { LedgerTransaction } from '../types/ledger';

export function useLedger() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setError('');
    try {
      setTransactions(await listTransactions());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  return { transactions, loading, error, reload };
}