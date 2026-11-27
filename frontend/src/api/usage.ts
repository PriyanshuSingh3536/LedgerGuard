import { endpoints, requireEndpoint } from './endpoints';
import { isMock } from './mockSession';
import { listTransactions } from './ledger';
import { transactionTotal } from '../utils/summarize';
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

  // Jab backend ka stats API aaye, endpoints.usage bharo aur is block ko hata do
  if (endpoints.usage) requireEndpoint(endpoints.usage, 'Usage');

  // Abhi: latest 100 transactions se din-wise count aur INR amount nikalte hain
  const { transactions } = await listTransactions(1, 100);
  const byDate = new Map<string, UsagePoint>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    byDate.set(key, { date: key, transactions: 0, amount: 0 });
  }
  for (const t of transactions) {
    const point = byDate.get((t.createdAt ?? '').slice(0, 10));
    if (!point) continue;
    point.transactions += 1;
    if (t.currency === 'INR') point.amount += transactionTotal(t); // alag currencies ko jodna galat hoga
  }
  return [...byDate.values()];
}