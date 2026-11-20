import { api } from './client';

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await api.get<{ success: boolean }>('/health');
    return res.data.success;
  } catch {
    return false;
  }
}