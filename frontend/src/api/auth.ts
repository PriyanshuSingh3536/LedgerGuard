import { get, post } from './client';
import { endpoints } from './endpoints';
import { isMock } from './mockSession';
import type { Me } from '../types';

export interface LoginResult {
  token: string;
  me: Me | null; // mock mein yahin milta hai, real mode mein /auth/me se aata hai
}

export interface RegisterInput {
  organizationName: string;
  organizationEmail: string;
  adminEmail: string;
  adminPassword: string;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const getMe = () => get<Me>(endpoints.me);

// Response ke andar naam dhoondhta hai (field ka exact naam pata na ho tab bhi chalega)
function deepFind(value: unknown, keys: string[], depth = 3): string | null {
  if (!value || typeof value !== 'object' || depth < 0) return null;
  const rec = value as Record<string, unknown>;
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v) return v;
  }
  for (const v of Object.values(rec)) {
    const found = deepFind(v, keys, depth - 1);
    if (found) return found;
  }
  return null;
}

export async function login(organizationId: string, email: string, password: string): Promise<LoginResult> {
  if (isMock()) {
    if (!organizationId.trim() || !email.trim() || !password) {
      throw new Error('Enter organization ID, email and password.');
    }
    const orgId = organizationId.trim();
    return {
      token: `mock-token-${orgId}`,
      me: { userId: `user-${orgId}`, organizationId: orgId, role: 'admin' },
    };
  }

  const data = await post<unknown>(endpoints.login, {
    organizationId: organizationId.trim(),
    email: email.trim(),
    password,
  });

  // TODO: Sanjana se token ka exact field naam confirm karo
  const token = deepFind(data, ['accessToken', 'token', 'access_token', 'jwt']);
  if (!token) {
    throw new Error('Login succeeded but no access token was found in the response. Ask the backend developer for the token field name.');
  }
  return { token, me: null };
}

export interface RegisterResult {
  organizationId: string | null;
  raw: unknown;
}

export async function register(input: RegisterInput): Promise<RegisterResult> {
  if (isMock()) {
    await wait(500);
    return { organizationId: 'company-a', raw: { mock: true } };
  }

  const data = await post<unknown>(endpoints.register, input);
  let organizationId = deepFind(data, ['organizationId', 'orgId', 'organization_id']);
  if (!organizationId && data && typeof data === 'object') {
    organizationId = deepFind((data as Record<string, unknown>).organization, ['id', '_id']);
  }
  return { organizationId, raw: data };
}