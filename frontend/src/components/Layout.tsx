import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { checkHealth } from '../api/health';
import { useSocket } from '../context/SocketContext';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `mb-1 block rounded-lg px-3 py-2.5 text-sm transition-colors ${isActive
    ? 'bg-slate-700 text-white'
    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
  }`;

export default function Layout() {
  const { me, logout } = useAuth();
  const [online, setOnline] = useState(false);
  const { status } = useSocket();
  const live = {
    live: { dot: 'bg-green-500 animate-pulse', text: 'Live' },
    connecting: { dot: 'bg-amber-400', text: 'Connecting...' },
    offline: { dot: 'bg-red-500', text: 'Offline' },
    disabled: { dot: 'bg-slate-400', text: 'Live updates off' },
  }[status];

  useEffect(() => {
    const ping = () => checkHealth().then(setOnline);
    ping();
    const id = setInterval(ping, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 bg-slate-900 px-3 py-5 text-white">
        <h1 className="mb-6 ml-2 text-lg font-semibold">LedgerGuard</h1>
        <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/ledger" className={linkClass}>Ledger</NavLink>
        <NavLink to="/organization" className={linkClass}>Organization</NavLink>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="text-sm">
            Organization:{' '}
            <span className="rounded bg-blue-50 px-2 py-0.5 font-semibold text-blue-700">
              {me?.organizationId}
            </span>
            <span className="ml-3 text-slate-500">Role: {me?.role}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
              <span className={`h-2.5 w-2.5 rounded-full ${live.dot}`} />
              {live.text}
            </span>
            <span className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-green-500' : 'bg-red-500'}`} />
              {online ? 'Backend online' : 'Backend offline'}
            </span>
            <button
              onClick={logout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}