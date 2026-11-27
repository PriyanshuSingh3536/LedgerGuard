import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLedger } from '../hooks/useLedger';
import { formatDateTime } from '../utils/format';
import { summarizeByCurrency } from '../utils/summarize';
import { checkTenantHealth } from '../api/tenant';

export default function Organization() {
  const { me } = useAuth();

  const { transactions, pagination, loading, error } = useLedger(1, 100);

  const [tenantState, setTenantState] = useState<
    'idle' | 'checking' | 'ok' | 'fail'
  >('idle');

  const dates = transactions
    .map((t) => t.createdAt ?? '')
    .filter(Boolean)
    .sort();

  const currencies = summarizeByCurrency(transactions).map(
    (s) => s.currency
  );

  const runTenantCheck = async () => {
    setTenantState('checking');

    try {
      const result = await checkTenantHealth();
      setTenantState(result ? 'ok' : 'fail');
    } catch {
      setTenantState('fail');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Organization</h2>

      {/* Account Details */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-medium">Account details</h3>

        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Organization ID</dt>
            <dd className="mt-0.5 text-sm font-semibold">
              {me?.organizationId}
            </dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">Your role</dt>
            <dd className="mt-0.5 text-sm">{me?.role}</dd>
          </div>

          <div>
            <dt className="text-xs text-slate-500">User ID</dt>
            <dd className="mt-0.5 font-mono text-xs">
              {me?.userId}
            </dd>
          </div>
        </dl>
      </div>

      {/* Ledger Overview */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-medium">Ledger overview</h3>

        {loading && (
          <p className="text-sm text-slate-500">Loading...</p>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && (
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Transactions</dt>
              <dd className="mt-0.5 text-sm">
                {pagination.totalRecords}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">Currencies</dt>
              <dd className="mt-0.5 text-sm">
                {currencies.join(', ') || '-'}
              </dd>
            </div>

            <div>
              <dt className="text-xs text-slate-500">First activity</dt>
              <dd className="mt-0.5 text-sm">
                {dates.length ? formatDateTime(dates[0]) : '-'}
              </dd>
            </div>
          </dl>
        )}
      </div>

      {/* Tenant Database Health Check */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-medium">Tenant database</h3>

        <div className="flex items-center gap-3">
          <button
            onClick={runTenantCheck}
            disabled={tenantState === 'checking'}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {tenantState === 'checking'
              ? 'Checking...'
              : 'Check connection'}
          </button>

          {tenantState === 'ok' && (
            <span className="text-sm text-green-700">
              Connected
            </span>
          )}

          {tenantState === 'fail' && (
            <span className="text-sm text-red-600">
              Not connected
            </span>
          )}
        </div>
      </div>

      {/* Organization Security Information */}
      <p className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-700">
        Your organization is identified by the backend from your
        verified login token. This app never sends an organization
        ID with a request, so you can only see your own
        organization's data.
      </p>
    </div>
  );
}