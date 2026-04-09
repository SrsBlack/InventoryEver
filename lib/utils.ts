import { format, parseISO, isValid, differenceInDays } from 'date-fns';

/**
 * Format a price number with currency symbol.
 */
export function formatPrice(amount: number | undefined, currency = 'USD'): string {
  if (amount === undefined || amount === null) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string for display.
 */
export function formatDate(dateString: string | undefined, fmt = 'MMM d, yyyy'): string {
  if (!dateString) return '—';
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '—';
    return format(date, fmt);
  } catch {
    return '—';
  }
}

/**
 * Get how many days until a future date (negative = past).
 */
export function daysUntil(dateString: string | undefined): number | null {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return null;
    return differenceInDays(date, new Date());
  } catch {
    return null;
  }
}

/**
 * Truncate a string to a max length with ellipsis.
 */
export function truncate(str: string | undefined, maxLength = 50): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/**
 * Generate a readable warranty status label.
 */
export function warrantyStatus(warrantyDate: string | undefined): {
  label: string;
  color: string;
} {
  const days = daysUntil(warrantyDate);
  if (days === null) return { label: 'No warranty', color: '#9CA3AF' };
  if (days < 0) return { label: 'Expired', color: '#EF4444' };
  if (days <= 30) return { label: `Expires in ${days}d`, color: '#F59E0B' };
  if (days <= 90) return { label: `Expires in ${Math.ceil(days / 7)}w`, color: '#10B981' };
  return { label: `Valid`, color: '#10B981' };
}

/**
 * Map item condition to color.
 */
export function conditionColor(condition: string): string {
  const map: Record<string, string> = {
    new: '#10B981',
    excellent: '#3B82F6',
    good: '#6C63FF',
    fair: '#F59E0B',
    poor: '#EF4444',
    damaged: '#9CA3AF',
  };
  return map[condition] ?? '#9CA3AF';
}

/**
 * Map item condition to label.
 */
export function conditionLabel(condition: string): string {
  const map: Record<string, string> = {
    new: 'New',
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
    damaged: 'Damaged',
  };
  return map[condition] ?? condition;
}

/**
 * Capitalize first letter.
 */
export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generate a random hex color.
 */
export function randomColor(): string {
  const colors = [
    '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
    '#10B981', '#EF4444', '#6366F1', '#14B8A6',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
