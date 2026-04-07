/**
 * lib/depreciation.ts
 * Pure computation helpers for depreciation and multi-currency.
 * No React, no side-effects, fully testable.
 */

// ─── Depreciation Methods ─────────────────────────────────────────────────────

export type DepreciationMethod = 'straight-line' | 'declining-balance' | 'sum-of-years';

export interface DepreciationScheduleEntry {
  year: number;
  bookValue: number;
  annualDepreciation: number;
  cumulativeDepreciation: number;
  percentRemaining: number;
}

export interface DepreciationResult {
  method: DepreciationMethod;
  originalValue: number;
  currentEstimatedValue: number;
  totalDepreciated: number;
  depreciationPercent: number;
  annualRate: number;
  ageYears: number;
  remainingLifeYears: number;
  schedule: DepreciationScheduleEntry[];
}

/**
 * Straight-line depreciation: equal amount each year.
 * currentValue = originalValue - (originalValue / usefulLife) * age
 */
export function straightLineDepreciation(
  originalValue: number,
  purchaseDate: Date,
  usefulLifeYears: number,
  salvageValue = 0,
): DepreciationResult {
  const ageMs = Date.now() - purchaseDate.getTime();
  const ageYears = Math.max(0, ageMs / (1000 * 60 * 60 * 24 * 365.25));
  const annualDepreciation = (originalValue - salvageValue) / usefulLifeYears;
  const totalDepreciated = Math.min(annualDepreciation * ageYears, originalValue - salvageValue);
  const currentEstimatedValue = Math.max(salvageValue, originalValue - totalDepreciated);
  const remainingLife = Math.max(0, usefulLifeYears - ageYears);

  const schedule: DepreciationScheduleEntry[] = [];
  let bookValue = originalValue;
  for (let y = 1; y <= usefulLifeYears; y++) {
    const dep = Math.min(annualDepreciation, bookValue - salvageValue);
    bookValue = Math.max(salvageValue, bookValue - dep);
    schedule.push({
      year: y,
      bookValue: round2(bookValue),
      annualDepreciation: round2(dep),
      cumulativeDepreciation: round2(originalValue - bookValue),
      percentRemaining: round2((bookValue / originalValue) * 100),
    });
  }

  return {
    method: 'straight-line',
    originalValue,
    currentEstimatedValue: round2(currentEstimatedValue),
    totalDepreciated: round2(totalDepreciated),
    depreciationPercent: round2((totalDepreciated / originalValue) * 100),
    annualRate: round2((annualDepreciation / originalValue) * 100),
    ageYears: round2(ageYears),
    remainingLifeYears: round2(remainingLife),
    schedule,
  };
}

/**
 * Declining-balance depreciation: fixed % of remaining book value each year.
 * Default rate = 2x straight-line (double declining balance).
 */
export function decliningBalanceDepreciation(
  originalValue: number,
  purchaseDate: Date,
  usefulLifeYears: number,
  salvageValue = 0,
  multiplier = 2,
): DepreciationResult {
  const ageMs = Date.now() - purchaseDate.getTime();
  const ageYears = Math.max(0, ageMs / (1000 * 60 * 60 * 24 * 365.25));
  const annualRate = (multiplier / usefulLifeYears) * 100;
  const rate = annualRate / 100;

  const schedule: DepreciationScheduleEntry[] = [];
  let bookValue = originalValue;
  for (let y = 1; y <= usefulLifeYears; y++) {
    const dep = Math.max(0, Math.min(bookValue * rate, bookValue - salvageValue));
    bookValue = Math.max(salvageValue, bookValue - dep);
    schedule.push({
      year: y,
      bookValue: round2(bookValue),
      annualDepreciation: round2(dep),
      cumulativeDepreciation: round2(originalValue - bookValue),
      percentRemaining: round2((bookValue / originalValue) * 100),
    });
  }

  // Interpolate current value
  const yearIdx = Math.floor(ageYears);
  const frac = ageYears - yearIdx;
  const fromValue = yearIdx === 0 ? originalValue : schedule[yearIdx - 1]?.bookValue ?? salvageValue;
  const toValue = schedule[yearIdx]?.bookValue ?? salvageValue;
  const currentEstimatedValue = Math.max(salvageValue, fromValue + (toValue - fromValue) * frac);
  const totalDepreciated = originalValue - currentEstimatedValue;

  return {
    method: 'declining-balance',
    originalValue,
    currentEstimatedValue: round2(currentEstimatedValue),
    totalDepreciated: round2(totalDepreciated),
    depreciationPercent: round2((totalDepreciated / originalValue) * 100),
    annualRate: round2(annualRate),
    ageYears: round2(ageYears),
    remainingLifeYears: round2(Math.max(0, usefulLifeYears - ageYears)),
    schedule,
  };
}

/**
 * Sum-of-years-digits depreciation: faster in early years.
 */
export function sumOfYearsDepreciation(
  originalValue: number,
  purchaseDate: Date,
  usefulLifeYears: number,
  salvageValue = 0,
): DepreciationResult {
  const ageMs = Date.now() - purchaseDate.getTime();
  const ageYears = Math.max(0, ageMs / (1000 * 60 * 60 * 24 * 365.25));
  const n = usefulLifeYears;
  const sumOfYears = (n * (n + 1)) / 2;
  const depreciableAmount = originalValue - salvageValue;

  const schedule: DepreciationScheduleEntry[] = [];
  let bookValue = originalValue;
  for (let y = 1; y <= n; y++) {
    const fraction = (n - y + 1) / sumOfYears;
    const dep = depreciableAmount * fraction;
    bookValue = Math.max(salvageValue, bookValue - dep);
    schedule.push({
      year: y,
      bookValue: round2(bookValue),
      annualDepreciation: round2(dep),
      cumulativeDepreciation: round2(originalValue - bookValue),
      percentRemaining: round2((bookValue / originalValue) * 100),
    });
  }

  // Interpolate current value
  const yearIdx = Math.floor(ageYears);
  const frac = ageYears - yearIdx;
  const fromValue = yearIdx === 0 ? originalValue : schedule[yearIdx - 1]?.bookValue ?? salvageValue;
  const toValue = schedule[yearIdx]?.bookValue ?? salvageValue;
  const currentEstimatedValue = Math.max(salvageValue, fromValue + (toValue - fromValue) * frac);
  const totalDepreciated = originalValue - currentEstimatedValue;

  return {
    method: 'sum-of-years',
    originalValue,
    currentEstimatedValue: round2(currentEstimatedValue),
    totalDepreciated: round2(totalDepreciated),
    depreciationPercent: round2((totalDepreciated / originalValue) * 100),
    annualRate: round2(((originalValue - (schedule[0]?.bookValue ?? 0)) / originalValue) * 100),
    ageYears: round2(ageYears),
    remainingLifeYears: round2(Math.max(0, n - ageYears)),
    schedule,
  };
}

/**
 * Auto-select depreciation method based on category or item type.
 */
export function suggestUsefulLife(categoryName?: string): number {
  const cat = (categoryName ?? '').toLowerCase();
  if (cat.includes('electronics') || cat.includes('laptop') || cat.includes('phone')) return 3;
  if (cat.includes('appliance') || cat.includes('kitchen')) return 10;
  if (cat.includes('vehicle') || cat.includes('car')) return 5;
  if (cat.includes('furniture') || cat.includes('sofa') || cat.includes('bed')) return 10;
  if (cat.includes('tool')) return 7;
  if (cat.includes('clothing') || cat.includes('wear')) return 3;
  if (cat.includes('jewelry') || cat.includes('art') || cat.includes('collectible')) return 20;
  return 5; // default
}

// ─── Currency helpers ─────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: 'MX$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
];

export function formatCurrencyAmount(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' || currency === 'KRW' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function getCurrencySymbol(currency = 'USD'): string {
  return SUPPORTED_CURRENCIES.find(c => c.code === currency)?.symbol ?? currency;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
