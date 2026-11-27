import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getToken } from '../api/client';
import type { ConnectionStatus, ServerEvents, TxStatus } from '../types/socket';

type Unsubscribe = () => void;

interface SocketValue {
  status: ConnectionStatus;
  subscribe: <K extends keyof ServerEvents>(
    event: K,
    handler: (payload: ServerEvents[K]) => void
  ) => Unsubscribe;
}

const SocketContext = createContext<SocketValue | null>(null);
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5000';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const listeners = useRef(new Map<string, Set<(payload: unknown) => void>>());

  const emit = useCallback((event: string, payload: unknown) => {
    listeners.current.get(event)?.forEach((handler) => handler(payload));
  }, []);

  const subscribe = useCallback<SocketValue['subscribe']>((event, handler) => {
    const fn = handler as (payload: unknown) => void;
    const set = listeners.current.get(event) ?? new Set();
    set.add(fn);
    listeners.current.set(event, set);
    return () => { set.delete(fn); };
  }, []);

  useEffect(() => {
    if (!me) return; // login ke baad hi connect karo
    // Backend mein Socket.io abhi nahi hai, isliye real mode mein tab tak connect nahi karte
    if (import.meta.env.VITE_USE_MOCK !== 'true' && import.meta.env.VITE_ENABLE_SOCKET !== 'true') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus('disabled');
      return;
    }

    // ---------- MOCK MODE: fake events ----------
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      const connectTimer = setTimeout(() => setStatus('live'), 800);
      const tick = setInterval(() => {
        const r = Math.random();
        const txStatus: TxStatus = r < 0.8 ? 'success' : r < 0.9 ? 'failed' : 'rolled_back';
        const amount = (50 + Math.floor(Math.random() * 450)) * 100;

        emit('transaction:update', {
          transactionId: crypto.randomUUID().slice(0, 8),
          currency: 'INR',
          amount,
          status: txStatus,
          createdAt: new Date().toISOString(),
        });

        // Sirf successful payment usage badhata hai
        if (txStatus === 'success') {
          emit('usage:update', {
            date: new Date().toISOString().slice(0, 10),
            transactions: 1,
            amount,
          });
        }
      }, 2500);

      return () => {
        clearTimeout(connectTimer);
        clearInterval(tick);
        setStatus('connecting');
      };
    }

    // ---------- REAL MODE: Socket.io ----------
    const socket = io(SOCKET_URL, { auth: { token: getToken() } });
    socket.on('connect', () => setStatus('live'));
    socket.on('disconnect', () => setStatus('offline'));
    socket.on('connect_error', () => setStatus('offline'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting'));
    socket.onAny((event: string, payload: unknown) => emit(event, payload));

    return () => {
      socket.disconnect();
      setStatus('connecting');
    };
  }, [me, emit]);

  const value = useMemo(() => ({ status, subscribe }), [status, subscribe]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used inside SocketProvider');
  return ctx;
}