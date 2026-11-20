// "49.99" -> 4999 (backend amounts are integers in minor units)
export function toMinorUnits(input: string): number | null {
  const s = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  const minor = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  return Number.isSafeInteger(minor) && minor >= 1 ? minor : null;
}

// 4999 -> "₹49.99"
export function formatMoney(minor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(minor / 100);
}