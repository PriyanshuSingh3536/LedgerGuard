import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Attempt } from '../types/ledger';

interface AttemptsValue {
  attempts: Attempt[];
  record: (a: Omit<Attempt, 'id' | 'at'>) => void;
  clear: () => void;
}

const AttemptsContext = createContext<AttemptsValue | null>(null);
let nextId = 1;

export function AttemptsProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const org = me?.organizationId ?? '';
  // Organization ke hisaab se alag, taaki Company A ke attempts Company B ko na dikhein
  const [byOrg, setByOrg] = useState<Record<string, Attempt[]>>({});
  const attempts = byOrg[org] ?? [];

  const record = useCallback<AttemptsValue['record']>(
    (a) =>
      setByOrg((prev) => ({
        ...prev,
        [org]: [{ ...a, id: nextId++, at: new Date().toISOString() }, ...(prev[org] ?? [])].slice(0, 50),
      })),
    [org]
  );

  const clear = useCallback(() => setByOrg((prev) => ({ ...prev, [org]: [] })), [org]);

  const value = useMemo(() => ({ attempts, record, clear }), [attempts, record, clear]);
  return <AttemptsContext.Provider value={value}>{children}</AttemptsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAttempts() {
  const ctx = useContext(AttemptsContext);
  if (!ctx) throw new Error('useAttempts must be used inside AttemptsProvider');
  return ctx;
}