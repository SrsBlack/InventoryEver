/**
 * Label & QR utilities for Phase 6: QR/Barcode Label Printing
 *
 * Strategy:
 *  - QR codes are rendered via the qrserver.com web API (zero native deps).
 *  - Labels are HTML strings printed via expo-print (native iOS/Android print dialog)
 *    or shared as a PDF file via expo-sharing.
 *  - Three label templates: small sticker, full label (with photo), shelf tag.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import type { Item } from '../types';

// ─── QR ──────────────────────────────────────────────────────────────────────

/** Deep-link scheme used in QR codes. Must match app.json `scheme`. */
const APP_SCHEME = 'inventory-ever';

/** Returns a URL that opens the item in the app when scanned. */
export function buildItemDeepLink(itemId: string): string {
  return `${APP_SCHEME}://item/${itemId}`;
}

/**
 * Returns a publicly accessible PNG URL for a QR code image.
 * Uses the free qrserver.com API — no native dependency needed.
 */
export function qrCodeUrl(data: string, size = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(data)}&size=${size}x${size}&color=0F1117&bgcolor=FFFFFF&margin=4`;
}

// ─── Template types ───────────────────────────────────────────────────────────

export type LabelTemplate = 'sticker' | 'full' | 'shelf';

export interface LabelOptions {
  template: LabelTemplate;
  showPrice: boolean;
  showLocation: boolean;
  showSerial: boolean;
  showBarcode: boolean;
  copies: number;
}

export const DEFAULT_LABEL_OPTIONS: LabelOptions = {
  template: 'full',
  showPrice: true,
  showLocation: true,
  showSerial: false,
  showBarcode: false,
  copies: 1,
};

// ─── HTML generators ──────────────────────────────────────────────────────────

// FIX(audit-2026-05-09 #I12) — condition and quantity are now escaped via esc() in all templates
function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatPrice(price: number | undefined, currency = 'USD'): string {
  if (!price) return '';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(price);
  } catch {
    return `$${price.toFixed(2)}`;
  }
}

/** Small sticker — compact, QR + name + optional serial */
function stickerHtml(item: Item, opts: LabelOptions): string {
  const qr = qrCodeUrl(buildItemDeepLink(item.id), 80);
  return `
    <div class="label sticker">
      <img class="qr" src="${qr}" />
      <div class="sticker-text">
        <div class="name">${esc(item.name)}</div>
        ${opts.showSerial && item.serial_number ? `<div class="meta">SN: ${esc(item.serial_number)}</div>` : ''}
        ${opts.showLocation && item.location_data?.full_path ? `<div class="meta">${esc(item.location_data.full_path)}</div>` : ''}
      </div>
    </div>`;
}

/** Full label — photo + QR + all details */
function fullLabelHtml(item: Item, opts: LabelOptions): string {
  const qr = qrCodeUrl(buildItemDeepLink(item.id), 120);
  const imageHtml = item.main_image_url
    ? `<img class="item-photo" src="${esc(item.main_image_url)}" />`
    : `<div class="item-photo placeholder">📦</div>`;

  return `
    <div class="label full">
      <div class="full-top">
        ${imageHtml}
        <div class="full-details">
          <div class="name">${esc(item.name)}</div>
          ${item.brand || item.model ? `<div class="sub">${esc(item.brand ?? '')}${item.brand && item.model ? ' · ' : ''}${esc(item.model ?? '')}</div>` : ''}
          ${opts.showPrice && item.purchase_price ? `<div class="price">${formatPrice(item.purchase_price, item.currency)}</div>` : ''}
          ${opts.showLocation && item.location_data?.full_path ? `<div class="meta">📍 ${esc(item.location_data.full_path)}</div>` : ''}
          ${opts.showSerial && item.serial_number ? `<div class="meta">SN: ${esc(item.serial_number)}</div>` : ''}
          <div class="condition-badge condition-${esc(item.condition)}">${esc(item.condition).toUpperCase()}</div>
        </div>
      </div>
      <div class="full-bottom">
        <img class="qr" src="${qr}" />
        <div class="qr-label">Scan to view</div>
      </div>
    </div>`;
}

/** Shelf tag — wide horizontal card for shelf-edge use */
function shelfTagHtml(item: Item, opts: LabelOptions): string {
  const qr = qrCodeUrl(buildItemDeepLink(item.id), 60);
  return `
    <div class="label shelf">
      <img class="qr" src="${qr}" />
      <div class="shelf-info">
        <div class="name">${esc(item.name)}</div>
        <div class="shelf-row">
          ${item.brand ? `<span class="chip">${esc(item.brand)}</span>` : ''}
          <span class="chip condition-${esc(item.condition)}">${esc(item.condition)}</span>
          ${opts.showPrice && item.purchase_price ? `<span class="chip price">${formatPrice(item.purchase_price, item.currency)}</span>` : ''}
        </div>
        ${opts.showLocation && (item.location_data?.name || item.location) ? `<div class="meta">📍 ${esc(item.location_data?.name ?? item.location)}</div>` : ''}
      </div>
      <div class="shelf-qty">
        <div class="qty-num">${esc(String(item.quantity))}</div>
        <div class="qty-unit">${esc(item.unit)}</div>
      </div>
    </div>`;
}

// ─── Full page HTML ────────────────────────────────────────────────────────────

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
  body { background: #fff; padding: 8px; }

  /* Sticker */
  .label.sticker {
    display: inline-flex; flex-direction: row; align-items: center; gap: 6px;
    border: 1.5px solid #252836; border-radius: 6px; padding: 6px 8px;
    width: 160px; margin: 4px; background: #fff;
    page-break-inside: avoid;
  }
  .sticker .qr { width: 56px; height: 56px; flex-shrink: 0; }
  .sticker-text { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }

  /* Full */
  .label.full {
    border: 1.5px solid #252836; border-radius: 8px; padding: 10px;
    width: 240px; margin: 6px; display: inline-block; background: #fff;
    page-break-inside: avoid;
  }
  .full-top { display: flex; flex-direction: row; gap: 10px; margin-bottom: 8px; }
  .item-photo { width: 72px; height: 72px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
  .item-photo.placeholder { width: 72px; height: 72px; background: #F3F4F6; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px; line-height: 72px; text-align: center; }
  .full-details { display: flex; flex-direction: column; gap: 3px; flex: 1; overflow: hidden; }
  .full-bottom { display: flex; flex-direction: row; align-items: center; gap: 8px; border-top: 1px solid #E5E7EB; padding-top: 6px; margin-top: 4px; }
  .qr-label { font-size: 8px; color: #9CA3AF; }

  /* Shelf */
  .label.shelf {
    display: flex; flex-direction: row; align-items: center; gap: 8px;
    border: 1.5px solid #252836; border-radius: 6px; padding: 6px 10px;
    width: 300px; margin: 4px; background: #fff;
    page-break-inside: avoid;
  }
  .shelf .qr { width: 48px; height: 48px; flex-shrink: 0; }
  .shelf-info { flex: 1; display: flex; flex-direction: column; gap: 3px; overflow: hidden; }
  .shelf-row { display: flex; flex-direction: row; flex-wrap: wrap; gap: 4px; }
  .shelf-qty { text-align: center; min-width: 36px; }
  .qty-num { font-size: 20px; font-weight: 800; color: #3B82F6; }
  .qty-unit { font-size: 9px; color: #9CA3AF; }

  /* Typography */
  .name { font-size: 13px; font-weight: 700; color: #111827; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sub { font-size: 10px; color: #6B7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .meta { font-size: 9px; color: #9CA3AF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .price { font-size: 12px; font-weight: 700; color: #10B981; }
  .chip { font-size: 9px; padding: 1px 5px; border-radius: 10px; background: #F3F4F6; color: #374151; }
  .chip.price { background: #D1FAE5; color: #065F46; }

  /* Condition badges */
  .condition-badge { align-self: flex-start; font-size: 8px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 5px; border-radius: 4px; margin-top: 4px; }
  .condition-new, .chip.condition-new { background: #D1FAE5; color: #065F46; }
  .condition-excellent, .chip.condition-excellent { background: #DBEAFE; color: #1E40AF; }
  .condition-good, .chip.condition-good { background: #E0F2FE; color: #0369A1; }
  .condition-fair, .chip.condition-fair { background: #FEF3C7; color: #92400E; }
  .condition-poor, .chip.condition-poor { background: #FEE2E2; color: #991B1B; }
  .condition-damaged, .chip.condition-damaged { background: #F3F4F6; color: #6B7280; }

  /* Print wrapper — flex-wrap so labels flow side by side */
  .page { display: flex; flex-wrap: wrap; align-items: flex-start; }
`;

export function buildLabelsHtml(items: Item[], opts: LabelOptions): string {
  const labelFn =
    opts.template === 'sticker' ? stickerHtml :
    opts.template === 'shelf'   ? shelfTagHtml :
    fullLabelHtml;

  const labelsHtml = items
    .flatMap(item => Array.from({ length: opts.copies }, () => labelFn(item, opts)))
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="page">${labelsHtml}</div></body>
</html>`;
}

// ─── Print / Share ────────────────────────────────────────────────────────────

/** Open native OS print dialog (iOS / Android). */
export async function printLabels(items: Item[], opts: LabelOptions): Promise<void> {
  const html = buildLabelsHtml(items, opts);
  await Print.printAsync({ html });
}

/**
 * Generate a PDF and open the system share sheet so the user can
 * save it to Files, AirDrop, email it, etc.
 */
export async function shareLabelsAsPdf(items: Item[], opts: LabelOptions): Promise<void> {
  const html = buildLabelsHtml(items, opts);
  const { uri } = await Print.printToFileAsync({ html });

  // Move to a stable cache location with a sensible filename
  const destName = items.length === 1
    ? `${items[0].name.replace(/[^a-zA-Z0-9]/g, '_')}_label.pdf`
    : `inventory_labels_${items.length}.pdf`;
  const dest = `${FileSystem.cacheDirectory}${destName}`;
  await FileSystem.moveAsync({ from: uri, to: dest });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
  }
}
