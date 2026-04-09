import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Item } from '../types';

// Generate a text summary of an item for sharing
export function generateItemSummary(item: Item): string {
  const lines = [
    `📦 ${item.name}`,
    item.brand ? `Brand: ${item.brand}` : null,
    item.model ? `Model: ${item.model}` : null,
    item.description ? `\n${item.description}` : null,
    '',
    item.purchase_price ? `💰 Value: $${item.purchase_price.toFixed(2)}` : null,
    item.condition ? `Condition: ${item.condition}` : null,
    item.location ? `📍 Location: ${item.location}` : null,
    item.serial_number ? `Serial: ${item.serial_number}` : null,
    item.warranty_expiry_date ? `🛡️ Warranty until: ${item.warranty_expiry_date}` : null,
    '',
    'Shared from InventoryEver',
  ].filter(Boolean);
  return lines.join('\n');
}

// Export item as JSON or CSV file and share
export async function shareItemAsFile(item: Item, format: 'json' | 'csv' = 'json'): Promise<void> {
  const filename = `${item.name.replace(/[^a-zA-Z0-9]/g, '_')}.${format}`;
  const path = `${FileSystem.cacheDirectory}${filename}`;

  if (format === 'json') {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(item, null, 2));
  } else {
    const headers = ['name', 'brand', 'model', 'condition', 'purchase_price', 'location', 'serial_number'];
    const escapeCSV = (val: unknown): string => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const values = headers.map(h => escapeCSV((item as unknown as Record<string, unknown>)[h]));
    await FileSystem.writeAsStringAsync(path, headers.join(',') + '\n' + values.join(','));
  }

  await Sharing.shareAsync(path);
}

// Share as plain text (for messaging apps)
export async function shareItemAsText(item: Item): Promise<void> {
  const summary = generateItemSummary(item);
  const path = `${FileSystem.cacheDirectory}item_summary.txt`;
  await FileSystem.writeAsStringAsync(path, summary);
  await Sharing.shareAsync(path);
}
