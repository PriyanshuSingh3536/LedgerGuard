import { useCallback, useEffect, useRef, useState } from 'react';
import { listTransactions } from '../api/ledger';
import type { LedgerTransaction, Pagination } from '../types/ledger';

const EMPTY: Pagination = { currentPage: 1, pageSize: 10, totalRecords: 0, totalPages: 1 };

export function useLedger(page = 1, limit = 10) {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0); // purane slow response naye ko overwrite na karein

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setError('');
    try {
      const result = await listTransactions(page, limit);
      if (id !== requestId.current) return;
      setTransactions(result.transactions);
      setPagination(result.pagination);
    } catch (e) {
      if (id === requestId.current) setError((e as Error).message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void reload();
  }, [reload]);

  return { transactions, pagination, loading, error, reload };
}