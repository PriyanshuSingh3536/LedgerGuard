// Sanjana se confirm karo: kya amount 10000 ka matlab ₹100.00 (paise) hai ya ₹10,000?
// Paise hai toh true rakho, warna .env mein VITE_AMOUNTS_IN_MINOR_UNITS=false
const MINOR = import.meta.env.VITE_AMOUNTS_IN_MINOR_UNITS !== 'false';
const FACTOR = MINOR ? 100 : 1;

// User ka input ("49.99") -> backend ko jane wala integer (4999)
export function toMinorUnits(input: string): number | null {
  const s = input.trim();
  const pattern = MINOR ? /^\d+(\.\d{1,2})?$/ : /^\d+$/;
  if (!pattern.test(s)) return null;

  let value: number;
  if (MINOR) {
    const [whole, frac = ''] = s.split('.');
    value = Number(whole) * 100 + Number(frac.padEnd(2, '0'));
  } else {
    value = Number(s);
  }
  return Number.isSafeInteger(value) && value >= 1 ? value : null;
}

export const fromMinorUnits = (minor: number) => minor / FACTOR;

export function formatMoney(minor: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: MINOR ? 2 : 0,
    maximumFractionDigits: MINOR ? 2 : 0,
  }).format(minor / FACTOR);
}