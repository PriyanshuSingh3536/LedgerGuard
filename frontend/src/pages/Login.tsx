import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getLastOrg, setLastOrg } from '../utils/lastOrg';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [organizationId, setOrganizationId] = useState(getLastOrg);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(organizationId, email, password);
      setLastOrg(organizationId.trim());
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-md">
        <div>
          <h1 className="text-2xl font-semibold">LedgerGuard</h1>
          <p className="text-sm text-slate-500">Sign in to your organization</p>
          {import.meta.env.VITE_USE_MOCK === 'true' && (
            <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
              Demo mode: enter organization ID <b>company-a</b> or <b>company-b</b>, with any email and password.
            </p>
          )}
        </div>

        <input
          placeholder="Organization ID"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
          className={`${inputClass} font-mono text-sm`}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <p className="text-center text-sm text-slate-500">
          New organization?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">Register</Link>
        </p>
      </form>
    </div>
  );
}