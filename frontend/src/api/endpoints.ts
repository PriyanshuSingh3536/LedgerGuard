interface Endpoints {
  health: string;
  tenantHealth: string;
  me: string;
  register: string;
  login: string;
  usage: string | null;
  ledger: {
    list: string;
    detail: ((transactionId: string) => string) | null;
    create: string;
  };
}

export const endpoints: Endpoints = {
  health: '/health',
  tenantHealth: '/tenant/health',
  me: '/auth/me',
  register: '/auth/register',
  login: '/auth/login',
  usage: null, // dashboard stats API abhi backend mein nahi hai
  ledger: {
    list: '/ledger',
    detail: null, // detail API abhi nahi hai
    create: '/ledger',
  },
};

export function requireEndpoint(path: string | null, name: string): string {
  if (!path) throw new Error(`The ${name} API is not available on the backend yet.`);
  return path;
}