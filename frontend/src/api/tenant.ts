import { api } from './client';
import { endpoints } from './endpoints';
import { isMock } from './mockSession';

export async function checkTenantHealth(): Promise<boolean> {
  if (isMock()) return true;
  try {
    await api.get(endpoints.tenantHealth);
    return true;
  } catch {
    return false;
  }
}