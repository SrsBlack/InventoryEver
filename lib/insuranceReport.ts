/**
 * lib/insuranceReport.ts
 * Builds insurance claim / home inventory reports.
 * Pure functions — no React, no side effects.
 */
import type { Item } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsuranceReportOptions {
  workspaceName: string;
  ownerName?: string;
  policyNumber?: string;
  claimDate?: string;
  includeImages: boolean;
  includeSerialNumbers: boolean;
  includeReceipts: boolean;
  valuationType: 'purchase' | 'current' | 'replacement';
  groupBy: 'category' | 'location' | 'none';
  filterCategoryIds?: string[];
  minValue?: number;
}

export interface InsuranceSummary {
  totalItems: number;
  totalValue: number;
  averageItemValue: number;
  highestValueItem: { name: string; value: number; currency: string } | null;
  categoryCount: number;
  itemsWithReceipts: number;
  itemsWithSerialNumbers: number;
}

export interface InsuranceLineItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  category?: string;
  location?: string;
  condition: string;
  purchase_date?: string;
  purchase_price?: number;
  current_value?: number;
  replacement_value?: number;
  reported_value: number;
  currency: string;
  warranty_expiry?: string;
  image_url?: string;
  receipt_url?: string;
  description?: string;
}

// ─── Compute ─────────────────────────────────────────────────────────────────

export function buildInsuranceLineItems(
  items: Item[],
  options: InsuranceReportOptions,
): InsuranceLineItem[] {
  let filtered = items;

  // Filter by category
  if (options.filterCategoryIds && options.filterCategoryIds.length > 0) {
    filtered = filtered.filter(i => i.category_id && options.filterCategoryIds!.includes(i.category_id));
  }

  // Filter by minimum value
  const minVal = options.minValue ?? 0;
  filtered = filtered.filter(i => {
    const v = getReportedValue(i, options.valuationType);
    return v >= minVal;
  });

  return filtered.map(item => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    model: item.model,
    serial_number: item.serial_number,
    category: item.category?.name,
    location: (item as any).location_data?.full_path ?? item.location,
    condition: item.condition,
    purchase_date: item.purchase_date,
    purchase_price: item.purchase_price,
    current_value: item.current_value,
    reported_value: getReportedValue(item, options.valuationType),
    currency: item.currency ?? 'USD',
    warranty_expiry: item.warranty_expiry_date,
    image_url: options.includeImages ? item.main_image_url : undefined,
    receipt_url: options.includeReceipts ? item.receipt_image_url : undefined,
    description: item.description,
  }));
}

export function computeInsuranceSummary(lineItems: InsuranceLineItem[]): InsuranceSummary {
  const totalItems = lineItems.length;
  const totalValue = lineItems.reduce((s, i) => s + i.reported_value, 0);
  const averageItemValue = totalItems > 0 ? totalValue / totalItems : 0;
  const categories = new Set(lineItems.map(i => i.category).filter(Boolean));
  const highestItem = [...lineItems].sort((a, b) => b.reported_value - a.reported_value)[0];
  return {
    totalItems,
    totalValue,
    averageItemValue,
    highestValueItem: highestItem
      ? { name: highestItem.name, value: highestItem.reported_value, currency: highestItem.currency }
      : null,
    categoryCount: categories.size,
    itemsWithReceipts: lineItems.filter(i => i.receipt_url).length,
    itemsWithSerialNumbers: lineItems.filter(i => i.serial_number).length,
  };
}

function getReportedValue(item: Item, type: InsuranceReportOptions['valuationType']): number {
  if (type === 'current') return item.current_value ?? item.purchase_price ?? 0;
  if (type === 'replacement') {
    // Estimate replacement as purchase_price * 1.15 (15% markup for inflation/new cost)
    const base = item.purchase_price ?? item.current_value ?? 0;
    return Math.round(base * 1.15);
  }
  return item.purchase_price ?? item.current_value ?? 0;
}

// ─── HTML Report ─────────────────────────────────────────────────────────────

export function buildInsuranceHtml(
  lineItems: InsuranceLineItem[],
  summary: InsuranceSummary,
  options: InsuranceReportOptions,
): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const valuationLabel = options.valuationType === 'current' ? 'Current Value'
    : options.valuationType === 'replacement' ? 'Replacement Value'
    : 'Purchase Price';

  const formatVal = (v: number, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(v);
    } catch { return `$${v.toFixed(0)}`; }
  };

  const esc = (s?: string) => (s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Group items
  const grouped = groupLineItems(lineItems, options.groupBy);

  const groupBlocks = Object.entries(grouped).map(([groupName, groupItems]) => {
    const groupTotal = groupItems.reduce((s, i) => s + i.reported_value, 0);
    const rows = groupItems.map((item, i) => `
      <tr class="${i % 2 === 0 ? '' : 'alt'}">
        <td>${i + 1}</td>
        <td><strong>${esc(item.name)}</strong>${item.description ? `<br><small>${esc(item.description)}</small>` : ''}</td>
        ${options.includeSerialNumbers ? `<td>${esc(item.serial_number) || '—'}<br><small>${esc(item.model)}</small></td>` : ''}
        <td>${esc(item.category)}<br><small>${esc(item.location)}</small></td>
        <td>${esc(item.condition)}</td>
        <td>${item.purchase_date ? new Date(item.purchase_date).toLocaleDateString() : '—'}</td>
        <td class="amount">${formatVal(item.reported_value, item.currency)}</td>
      </tr>`).join('');

    return `
      <h3 class="group-header">${esc(groupName)}</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            ${options.includeSerialNumbers ? '<th>Serial / Model</th>' : ''}
            <th>Category / Location</th>
            <th>Condition</th>
            <th>Purchase Date</th>
            <th class="amount">${valuationLabel}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="${options.includeSerialNumbers ? 6 : 5}" class="group-total-label">
              ${esc(groupName)} Subtotal (${groupItems.length} items)
            </td>
            <td class="amount group-total">${formatVal(groupTotal)}</td>
          </tr>
        </tfoot>
      </table>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Insurance Inventory Report — ${esc(options.workspaceName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Helvetica Neue, Arial, sans-serif; font-size: 12px; color: #1F2937; background: #fff; padding: 32px; }
  .header { border-bottom: 3px solid #1D4ED8; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 24px; color: #1D4ED8; margin-bottom: 4px; }
  .header .meta { color: #6B7280; font-size: 11px; line-height: 1.8; }
  .header .meta strong { color: #374151; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 1.2px; color: #6B7280; margin: 24px 0 10px; }
  h3.group-header { font-size: 13px; font-weight: 700; color: #1F2937; margin: 20px 0 8px; padding: 8px 12px; background: #F3F4F6; border-radius: 6px; border-left: 3px solid #3B82F6; }
  .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat { background: #F9FAFB; border-radius: 8px; padding: 14px; border-left: 3px solid #3B82F6; }
  .stat.amber { border-left-color: #F59E0B; }
  .stat.green { border-left-color: #10B981; }
  .stat.red { border-left-color: #EF4444; }
  .stat-value { font-size: 20px; font-weight: 800; color: #111827; }
  .stat-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; font-size: 11px; }
  th { background: #1D4ED8; color: #fff; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
  th.amount { text-align: right; }
  td { padding: 7px 10px; border-bottom: 1px solid #F3F4F6; vertical-align: top; }
  td.amount { text-align: right; font-weight: 600; }
  tr.alt td { background: #F9FAFB; }
  tfoot td { background: #EFF6FF; font-weight: 600; border-top: 2px solid #BFDBFE; }
  td.group-total-label { color: #374151; }
  td.group-total { color: #1D4ED8; font-weight: 800; font-size: 13px; text-align: right; }
  .grand-total { text-align: right; margin-top: 16px; padding: 16px; background: #1D4ED8; color: #fff; border-radius: 8px; }
  .grand-total-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
  .grand-total-value { font-size: 28px; font-weight: 800; margin-top: 4px; }
  .notes { margin-top: 32px; padding: 16px; border: 1px solid #E5E7EB; border-radius: 8px; }
  .notes h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.8px; color: #6B7280; margin-bottom: 10px; }
  .note-line { height: 24px; border-bottom: 1px solid #E5E7EB; margin-bottom: 4px; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 10px; color: #9CA3AF; text-align: center; }
  small { font-size: 10px; color: #9CA3AF; }
  @media print { body { padding: 0; } @page { margin: 15mm; size: A4; } }
</style>
</head>
<body>

<div class="header">
  <h1>Home Inventory Insurance Report</h1>
  <div class="meta">
    <strong>Property / Workspace:</strong> ${esc(options.workspaceName)}<br>
    ${options.ownerName ? `<strong>Owner:</strong> ${esc(options.ownerName)}<br>` : ''}
    ${options.policyNumber ? `<strong>Policy Number:</strong> ${esc(options.policyNumber)}<br>` : ''}
    ${options.claimDate ? `<strong>Claim / Report Date:</strong> ${esc(options.claimDate)}<br>` : ''}
    <strong>Report Generated:</strong> ${date}<br>
    <strong>Valuation Method:</strong> ${valuationLabel}
  </div>
</div>

<h2>Summary</h2>
<div class="summary-grid">
  <div class="stat">
    <div class="stat-value">${summary.totalItems}</div>
    <div class="stat-label">Total Items</div>
  </div>
  <div class="stat amber">
    <div class="stat-value">${formatVal(summary.totalValue)}</div>
    <div class="stat-label">Total ${valuationLabel}</div>
  </div>
  <div class="stat green">
    <div class="stat-value">${summary.itemsWithSerialNumbers}</div>
    <div class="stat-label">With Serial #</div>
  </div>
  <div class="stat green">
    <div class="stat-value">${summary.itemsWithReceipts}</div>
    <div class="stat-label">With Receipts</div>
  </div>
</div>

<h2>Inventory Details</h2>
${groupBlocks}

<div class="grand-total">
  <div class="grand-total-label">Total ${valuationLabel} — ${summary.totalItems} Items</div>
  <div class="grand-total-value">${formatVal(summary.totalValue)}</div>
</div>

<div class="notes">
  <h4>Notes / Claim Details</h4>
  ${[1, 2, 3, 4].map(() => '<div class="note-line"></div>').join('')}
</div>

<div class="footer">
  Generated by InventoryEver &bull; ${date} &bull; This report is for reference purposes.
  Always confirm values with licensed appraisers for official insurance claims.
</div>
</body>
</html>`;
}

// ─── Grouping helper ──────────────────────────────────────────────────────────

function groupLineItems(
  items: InsuranceLineItem[],
  groupBy: InsuranceReportOptions['groupBy'],
): Record<string, InsuranceLineItem[]> {
  if (groupBy === 'none') return { 'All Items': items };

  const map: Record<string, InsuranceLineItem[]> = {};
  for (const item of items) {
    const key = groupBy === 'category'
      ? (item.category ?? 'Uncategorized')
      : (item.location ?? 'No Location');
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }

  // Sort groups by total value desc
  return Object.fromEntries(
    Object.entries(map).sort(([, a], [, b]) =>
      b.reduce((s, i) => s + i.reported_value, 0) -
      a.reduce((s, i) => s + i.reported_value, 0),
    ),
  );
}
