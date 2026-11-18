import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  return me ? <>{children}</> : <Navigate to="/login" replace />;
}