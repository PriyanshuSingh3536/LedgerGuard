import { get } from './client';
import { endpoints, requireEndpoint } from './endpoints';
import { isMock } from './mockSession';
import type { UsagePoint } from '../types';

export async function getUsage(days: number): Promise<UsagePoint[]> {
  if (isMock()) {
    await new Promise((r) => setTimeout(r, 400));
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const transactions = Math.round(40 + 25 * Math.sin(i / 3) + Math.random() * 15);
      return {
        date: d.toISOString().slice(0, 10),
        transactions,
        amount: transactions * (45000 + Math.round(Math.random() * 20000)),
      };
    });
  }

  const path = requireEndpoint(endpoints.usage, 'Usage');
  return get<UsagePoint[]>(`${path}?days=${days}`); // TODO: query format confirm karo
}