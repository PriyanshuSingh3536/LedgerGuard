import { useState } from 'react';
import { useLedger } from '../hooks/useLedger';
import LedgerTable from '../components/ledger/LedgerTable';
import TransactionForm from '../components/ledger/TransactionForm';

export default function Ledger() {
  const { transactions, loading, error, reload } = useLedger();
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ledger</h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'Close' : '+ New transaction'}
        </button>
      </div>

      {showForm && <TransactionForm onCreated={reload} />}

      {loading && <p className="text-slate-500">Loading...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && <LedgerTable transactions={transactions} />}
    </div>
  );
}