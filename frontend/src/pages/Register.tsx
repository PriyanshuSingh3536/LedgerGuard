import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { register, type RegisterInput, type RegisterResult } from '../api/auth';
import { setLastOrg } from '../utils/lastOrg';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200';

const fields: Array<{ key: keyof RegisterInput; type: string; placeholder: string }> = [
  { key: 'organizationName', type: 'text', placeholder: 'Organization name' },
  { key: 'organizationEmail', type: 'email', placeholder: 'Organization email' },
  { key: 'adminEmail', type: 'email', placeholder: 'Admin email' },
  { key: 'adminPassword', type: 'password', placeholder: 'Admin password (min 8 characters)' },
];

export default function Register() {
  const [form, setForm] = useState<RegisterInput>({
    organizationName: '',
    organizationEmail: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<RegisterResult | null>(null);
  const [copied, setCopied] = useState(false);

  const onChange = (key: keyof RegisterInput) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await register(form);
      if (res.organizationId) setLastOrg(res.organizationId); // login page par apne aap bhar jayega
      setResult(res);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked, user manually copy kar sakta hai */
    }
  };

  if (result) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow-md">
          <h1 className="text-2xl font-semibold">Organization registered</h1>

          {result.organizationId ? (
            <>
              <p className="text-sm text-slate-600">
                Save your Organization ID. You need it every time you log in.
              </p>
              <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className="min-w-0 flex-1 break-all font-mono text-sm">{result.organizationId}</span>
                <button
                  onClick={() => copy(result.organizationId as string)}
                  className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Registered, but the organization ID could not be found in the response. Find it in the response
                below (or ask the backend developer).
              </p>
              <pre className="max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 text-xs">
                {JSON.stringify(result.raw, null, 2)}
              </pre>
            </>
          )}

          <Link
            to="/login"
            className="block rounded-lg bg-blue-600 py-2 text-center font-medium text-white hover:bg-blue-700"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-md">
        <div>
          <h1 className="text-2xl font-semibold">Register organization</h1>
          <p className="text-sm text-slate-500">Create a new tenant with its own isolated database</p>
        </div>

        {fields.map((f) => (
          <input
            key={f.key}
            required
            type={f.type}
            minLength={f.key === 'adminPassword' ? 8 : undefined}
            placeholder={f.placeholder}
            value={form[f.key]}
            onChange={onChange(f.key)}
            className={inputClass}
          />
        ))}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Registering...' : 'Register'}
        </button>

        <p className="text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Login</Link>
        </p>
      </form>
    </div>
  );
}