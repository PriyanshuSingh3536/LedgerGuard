import { createContext, useContext, useState, type ReactNode } from 'react';
import { login as loginApi, getMe } from '../api/auth';
import { setToken } from '../api/client';
import type { Me } from '../types';

interface AuthValue {
  me: Me | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);

  const login = async (email: string, password: string) => {
    const token = await loginApi(email, password);
    setToken(token);
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      setMe({ userId: 'u1', organizationId: 'company-a', role: 'admin' });
    } else {
      setMe(await getMe());
    }
  };

  const logout = () => { setToken(null); setMe(null); };

  return <AuthContext.Provider value={{ me, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}