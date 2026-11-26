import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Ledger from './pages/Ledger';
import TransactionDetail from './pages/TransactionDetail';
import Organization from './pages/Organization';
import { NotificationProvider } from './context/NotificationContext';
import ToastContainer from './components/ToastContainer';
import { AttemptsProvider } from './context/AttemptsContext';

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <AttemptsProvider>
          <SocketProvider>
            <BrowserRouter>
              <ToastContainer />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/ledger" element={<Ledger />} />
                  <Route path="/ledger/:transactionId" element={<TransactionDetail />} />
                  <Route path="/organization" element={<Organization />} />
                </Route>
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </BrowserRouter>
          </SocketProvider>
        </AttemptsProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}