// null = backend mein abhi nahi bana. Sanjana se confirm hone ke baad hi bharna.
interface Endpoints {
  health: string;
  me: string;
  login: string | null;
  usage: string | null;
  ledger: {
    list: string | null;
    detail: ((transactionId: string) => string) | null;
    create: string | null;
  };
}

export const endpoints: Endpoints = {
  health: '/health',
  me: '/auth/me',
  login: null,
  usage: null,
  ledger: { list: null, detail: null, create: null },
};

export function requireEndpoint(path: string | null, name: string): string {
  if (!path) throw new Error(`The ${name} API is not available on the backend yet.`);
  return path;
}