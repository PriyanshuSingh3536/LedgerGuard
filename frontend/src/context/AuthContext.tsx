import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as loginApi, getMe } from '../api/auth';
import { setToken } from '../api/client';
import { isMock, setMockOrg } from '../api/mockSession';
import type { Me } from '../types';

interface AuthValue {
  me: Me | null;
  ready: boolean; // false jab tak saved session check ho rahi hai
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

interface Saved { token: string; me: Me }

const KEY = 'lg_session';
const AuthContext = createContext<AuthValue | null>(null);

function readSaved(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}

function writeSaved(value: Saved | null) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* storage blocked, session sirf memory mein rahegi */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    setMe(null);
    writeSaved(null);
  }, []);

  // Page refresh par session restore karo
  useEffect(() => {
    const saved = readSaved();
    if (!saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReady(true);
      return;
    }
    setToken(saved.token);

    if (isMock()) {
      setMockOrg(saved.me.organizationId);
      setMe(saved.me);
      setReady(true);
      return;
    }

    // Real mode: token ab bhi valid hai ya nahi, backend se verify karo
    getMe()
      .then((user) => {
        setMe(user);
        writeSaved({ token: saved.token, me: user });
      })
      .catch(() => {
        setToken(null);
        writeSaved(null);
      })
      .finally(() => setReady(true));
  }, []);

  // Kisi bhi API se 401 aaye toh logout
  useEffect(() => {
    window.addEventListener('lg:unauthorized', logout);
    return () => window.removeEventListener('lg:unauthorized', logout);
  }, [logout]);

  const login = async (email: string, password: string) => {
    const { token, me: mockMe } = await loginApi(email, password);
    setToken(token);
    try {
      const user = mockMe ?? (await getMe());
      if (isMock()) setMockOrg(user.organizationId);
      setMe(user);
      writeSaved({ token, me: user });
    } catch (e) {
      setToken(null);
      throw e;
    }
  };

  return <AuthContext.Provider value={{ me, ready, login, logout }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}