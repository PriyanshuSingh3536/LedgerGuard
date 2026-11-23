import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { me, ready } = useAuth();

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>;
  }
  return me ? <>{children}</> : <Navigate to="/login" replace />;
}