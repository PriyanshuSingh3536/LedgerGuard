import type { UsagePoint } from '../types';

export async function getUsage(days: number): Promise<UsagePoint[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    await new Promise((r) => setTimeout(r, 400)); // fake network delay
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
  throw new Error('Usage endpoint abhi backend mein nahi hai');
}