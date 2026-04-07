import { format } from 'date-fns';
import type { Item } from '../types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TimePeriodFilter = 'all' | 'year' | 'month30';

export interface CategoryValue {
  name: string;
  value: number;
}

export interface LocationValue {
  name: string;
  value: number;
}

export interface TopItem {
  id: string;
  name: string;
  value: number;
  currency: string;
}

export interface WeekBucket {
  weekLabel: string;
  count: number;
  weekStart: Date;
}

export interface AnalyticsSummary {
  totalItems: number;
  totalPortfolioValue: number;
  averageItemValue: number;
  activeWarrantyCount: number;
}

export interface AnalyticsInsights {
  mostCommonCategory: string | null;
  highestValueItem: TopItem | null;
  uncategorizedCount: number;
  unlocatedCount: number;
}

// ─── Time Period Filter ───────────────────────────────────────────────────────

export function filterByPeriod(items: Item[], period: TimePeriodFilter): Item[] {
  if (period === 'all') return items;
  const now = new Date();
  let cutoff: Date;
  if (period === 'year') {
    cutoff = new Date(now.getFullYear(), 0, 1);
  } else {
    cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return items.filter(item => new Date(item.created_at) >= cutoff);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function computeSummary(items: Item[]): AnalyticsSummary {
  const totalItems = items.length;
  const totalPortfolioValue = items.reduce((sum, item) => {
    const value = (item.current_value ?? item.purchase_price ?? 0) * (item.quantity ?? 1);
    return sum + value;
  }, 0);
  const averageItemValue = totalItems > 0 ? totalPortfolioValue / totalItems : 0;
  const now = new Date();
  const activeWarrantyCount = items.filter(item => {
    if (!item.warranty_expiry_date) return false;
    return new Date(item.warranty_expiry_date) > now;
  }).length;
  return { totalItems, totalPortfolioValue, averageItemValue, activeWarrantyCount };
}

// ─── Value by Category ────────────────────────────────────────────────────────

export function computeValueByCategory(items: Item[]): CategoryValue[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const name = item.category?.name ?? 'Uncategorized';
    const value = (item.current_value ?? item.purchase_price ?? 0) * (item.quantity ?? 1);
    map[name] = (map[name] ?? 0) + value;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ─── Value by Location ────────────────────────────────────────────────────────

export function computeValueByLocation(items: Item[]): LocationValue[] {
  const map: Record<string, number> = {};
  for (const item of items) {
    const name =
      (item as any).location_data?.full_path ??
      (item as any).location_data?.name ??
      item.location ??
      'No Location';
    const value = (item.current_value ?? item.purchase_price ?? 0) * (item.quantity ?? 1);
    map[name] = (map[name] ?? 0) + value;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

// ─── Top Value Items ──────────────────────────────────────────────────────────

export function computeTopValueItems(items: Item[]): TopItem[] {
  return items
    .map(item => ({
      id: item.id,
      name: item.name,
      value: item.current_value ?? item.purchase_price ?? 0,
      currency: item.currency ?? 'USD',
    }))
    .filter(x => x.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

// ─── Items Over Time (8 weekly buckets) ───────────────────────────────────────

export function computeItemsOverTime(items: Item[]): WeekBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build 8 Sunday-start weekly buckets going back 8 weeks
  const buckets: WeekBucket[] = [];
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() - i * 7);
    weekStart.setHours(0, 0, 0, 0);
    buckets.push({
      weekLabel: format(weekStart, 'MMM d'),
      count: 0,
      weekStart,
    });
  }

  // Assign each item to its bucket
  for (const item of items) {
    const d = new Date(item.created_at);
    d.setHours(0, 0, 0, 0);
    for (let i = 0; i < buckets.length; i++) {
      const bucketEnd = new Date(buckets[i].weekStart);
      bucketEnd.setDate(buckets[i].weekStart.getDate() + 6);
      bucketEnd.setHours(23, 59, 59, 999);
      if (d >= buckets[i].weekStart && d <= bucketEnd) {
        buckets[i].count += 1;
        break;
      }
    }
  }

  return buckets;
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export function computeInsights(items: Item[]): AnalyticsInsights {
  // Most common category
  const categoryCount: Record<string, number> = {};
  for (const item of items) {
    const name = item.category?.name;
    if (name) categoryCount[name] = (categoryCount[name] ?? 0) + 1;
  }
  const mostCommonCategory =
    Object.entries(categoryCount).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  // Highest value item (per-unit)
  const highestValueItem =
    items
      .map(item => ({
        id: item.id,
        name: item.name,
        value: item.current_value ?? item.purchase_price ?? 0,
        currency: item.currency ?? 'USD',
      }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value)[0] ?? null;

  const uncategorizedCount = items.filter(i => !i.category_id).length;
  const unlocatedCount = items.filter(
    i => !(i as any).location_id && !i.location,
  ).length;

  return { mostCommonCategory, highestValueItem, uncategorizedCount, unlocatedCount };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `$${value.toFixed(0)}`;
  }
}

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PERIOD_LABELS: Record<TimePeriodFilter, string> = {
  all: 'All Time',
  year: 'This Year',
  month30: 'Last 30 Days',
};

// ─── Enhanced CSV ─────────────────────────────────────────────────────────────

export function buildEnhancedCsv(items: Item[]): string {
  const headers = [
    'id', 'name', 'brand', 'model', 'serial_number', 'quantity', 'condition',
    'purchase_price', 'current_value', 'currency', 'purchase_date',
    'warranty_expiry_date', 'category', 'location_full_path', 'location_name',
  ];
  const q = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const rows = items.map(item => [
    item.id,
    item.name ?? '',
    item.brand ?? '',
    item.model ?? '',
    item.serial_number ?? '',
    String(item.quantity ?? 1),
    item.condition ?? '',
    String(item.purchase_price ?? ''),
    String(item.current_value ?? ''),
    item.currency ?? 'USD',
    item.purchase_date ?? '',
    item.warranty_expiry_date ?? '',
    item.category?.name ?? '',
    (item as any).location_data?.full_path ?? item.location ?? '',
    (item as any).location_data?.name ?? '',
  ].map(v => q(String(v))).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// ─── PDF Report HTML ──────────────────────────────────────────────────────────

export function buildReportHtml(
  items: Item[],
  summary: AnalyticsSummary,
  insights: AnalyticsInsights,
  topItems: TopItem[],
  byCategory: CategoryValue[],
  byLocation: LocationValue[],
  period: TimePeriodFilter,
  workspaceName: string,
): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const categoryRows = byCategory
    .slice(0, 10)
    .map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${formatCurrency(r.value)}</td></tr>`)
    .join('');
  const locationRows = byLocation
    .slice(0, 10)
    .map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.name)}</td><td>${formatCurrency(r.value)}</td></tr>`)
    .join('');
  const topItemRows = topItems
    .map((item, i) => `<tr><td>${i + 1}</td><td>${esc(item.name)}</td><td>${formatCurrency(item.value, item.currency)}</td></tr>`)
    .join('');

  const insightLines = [
    insights.mostCommonCategory
      ? `Most common category: <strong>${esc(insights.mostCommonCategory)}</strong>`
      : 'No categories assigned yet',
    insights.highestValueItem
      ? `Highest-value item: <strong>${esc(insights.highestValueItem.name)}</strong> (${formatCurrency(insights.highestValueItem.value, insights.highestValueItem.currency)})`
      : 'No item values recorded yet',
    `Uncategorized items: <strong>${insights.uncategorizedCount}</strong>`,
    `Items without location: <strong>${insights.unlocatedCount}</strong>`,
  ]
    .map(l => `<div class="insight-row">${l}</div>`)
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Inventory Analytics Report</title>
<style>
  body { font-family: -apple-system, Helvetica Neue, Helvetica, Arial, sans-serif; padding: 32px; color: #111827; font-size: 13px; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1F2937; }
  .meta { font-size: 12px; color: #6B7280; margin-bottom: 28px; }
  h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #6B7280; margin: 24px 0 8px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 4px; }
  .stat { background: #F9FAFB; border-radius: 8px; padding: 14px; border-left: 3px solid #3B82F6; }
  .stat-value { font-size: 22px; font-weight: 800; color: #111827; }
  .stat-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th { background: #F3F4F6; text-align: left; padding: 8px 10px; font-size: 11px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 10px; border-bottom: 1px solid #F3F4F6; color: #374151; }
  td:first-child { color: #9CA3AF; font-weight: 600; width: 32px; }
  td:last-child { text-align: right; font-weight: 600; }
  .insight-row { padding: 6px 0; border-bottom: 1px solid #F9FAFB; color: #374151; }
  .insight-row:last-child { border-bottom: none; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 11px; color: #9CA3AF; }
  @media print { body { padding: 0; } @page { margin: 20mm; } }
</style>
</head>
<body>
<h1>Inventory Analytics Report</h1>
<p class="meta">${esc(workspaceName)} &bull; ${PERIOD_LABELS[period]} &bull; Generated ${date}</p>

<h2>Summary</h2>
<div class="grid">
  <div class="stat">
    <div class="stat-value">${summary.totalItems}</div>
    <div class="stat-label">Total Items</div>
  </div>
  <div class="stat" style="border-left-color:#F59E0B">
    <div class="stat-value">${formatCurrency(summary.totalPortfolioValue)}</div>
    <div class="stat-label">Portfolio Value</div>
  </div>
  <div class="stat" style="border-left-color:#10B981">
    <div class="stat-value">${formatCurrency(summary.averageItemValue)}</div>
    <div class="stat-label">Avg Item Value</div>
  </div>
  <div class="stat" style="border-left-color:#10B981">
    <div class="stat-value">${summary.activeWarrantyCount}</div>
    <div class="stat-label">Active Warranties</div>
  </div>
</div>

<h2>Value by Category</h2>
<table>
  <tr><th>#</th><th>Category</th><th>Total Value</th></tr>
  ${categoryRows || '<tr><td colspan="3" style="text-align:center;color:#9CA3AF">No category data</td></tr>'}
</table>

<h2>Value by Location</h2>
<table>
  <tr><th>#</th><th>Location</th><th>Total Value</th></tr>
  ${locationRows || '<tr><td colspan="3" style="text-align:center;color:#9CA3AF">No location data</td></tr>'}
</table>

<h2>Top 5 Most Valuable Items</h2>
<table>
  <tr><th>#</th><th>Item Name</th><th>Value</th></tr>
  ${topItemRows || '<tr><td colspan="3" style="text-align:center;color:#9CA3AF">No value data</td></tr>'}
</table>

<h2>Insights</h2>
<div style="background:#F9FAFB;border-radius:8px;padding:12px 16px;">
${insightLines}
</div>

<div class="footer">Generated by InventoryEver &bull; ${date} &bull; ${items.length} items exported</div>
</body>
</html>`;
}
