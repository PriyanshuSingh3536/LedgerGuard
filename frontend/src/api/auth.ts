import { get, post } from './client';
import { endpoints, requireEndpoint } from './endpoints';
import { isMock } from './mockSession';
import type { Me } from '../types';

export const getMe = () => get<Me>(endpoints.me);

export interface LoginResult {
  token: string;
  me: Me | null; // mock mode mein me yahin mil jata hai, real mode mein /auth/me se aayega
}

export async function login(email: string, password: string): Promise<LoginResult> {
  if (isMock()) {
    if (!email.trim() || !password) throw new Error('Enter your email and password.');
    // Demo: email mein "companyb" ho toh Company B, warna Company A
    const orgId = /company-?b/i.test(email) ? 'company-b' : 'company-a';
    return {
      token: `mock-token-${orgId}`,
      me: { userId: `user-${orgId}`, organizationId: orgId, role: 'admin' },
    };
  }

  const path = requireEndpoint(endpoints.login, 'Login');
  // TODO: request body aur response shape Sanjana se confirm karke update karo
  const data = await post<{ token: string }>(path, { email, password });
  return { token: data.token, me: null };
}