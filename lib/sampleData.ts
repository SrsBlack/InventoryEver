/**
 * sampleData.ts
 * Pre-built demo inventory for new users to explore the app.
 * Call loadSampleData() to insert items into the user's workspace,
 * then clearSampleData() to remove them.
 */

import { supabase } from './supabase';

const SAMPLE_TAG = '__sample__';

export const SAMPLE_ITEMS = [
  {
    name: 'MacBook Pro 14"',
    brand: 'Apple',
    model: 'MKGP3LL/A',
    category: 'Electronics',
    condition: 'excellent' as const,
    quantity: 1,
    purchase_price: 1999,
    purchase_date: '2023-09-15',
    warranty_expiry_date: '2025-09-15',
    location_name: 'Home Office',
    tags: ['work', 'laptop'],
    notes: 'Primary work machine. AppleCare+ expires Sep 2025.',
    serial_number: 'C02XG2JHQ6LQ',
  },
  {
    name: 'Herman Miller Aeron Chair',
    brand: 'Herman Miller',
    model: 'Aeron Size B',
    category: 'Furniture',
    condition: 'good' as const,
    quantity: 1,
    purchase_price: 1395,
    purchase_date: '2022-03-10',
    warranty_expiry_date: '2034-03-10',
    location_name: 'Home Office',
    tags: ['office', 'furniture'],
    notes: '12-year warranty. Fully adjustable lumbar and armrests.',
  },
  {
    name: 'Sony WH-1000XM5',
    brand: 'Sony',
    model: 'WH-1000XM5',
    category: 'Electronics',
    condition: 'excellent' as const,
    quantity: 1,
    purchase_price: 349,
    purchase_date: '2023-06-01',
    warranty_expiry_date: '2024-06-01',
    location_name: 'Living Room',
    tags: ['audio', 'wireless'],
    notes: 'Noise-cancelling headphones. Warranty expired — check extended coverage.',
  },
  {
    name: 'Vitamix E310 Blender',
    brand: 'Vitamix',
    model: 'E310',
    category: 'Kitchen',
    condition: 'good' as const,
    quantity: 1,
    purchase_price: 349,
    purchase_date: '2021-11-28',
    warranty_expiry_date: '2026-11-28',
    location_name: 'Kitchen',
    tags: ['appliance', 'cooking'],
    notes: '5-year warranty. Self-cleaning program works great.',
  },
  {
    name: 'DEWALT 20V Drill Set',
    brand: 'DEWALT',
    model: 'DCD771C2',
    category: 'Tools',
    condition: 'good' as const,
    quantity: 1,
    purchase_price: 129,
    purchase_date: '2020-05-15',
    location_name: 'Garage',
    tags: ['tools', 'power-tools'],
    notes: 'Includes 2 batteries, charger, and carrying case. Stored in garage cabinet.',
  },
  {
    name: 'LG 27" 4K Monitor',
    brand: 'LG',
    model: '27UK850-W',
    category: 'Electronics',
    condition: 'excellent' as const,
    quantity: 2,
    purchase_price: 449,
    purchase_date: '2023-01-20',
    warranty_expiry_date: '2024-01-20',
    location_name: 'Home Office',
    tags: ['monitor', 'display', 'work'],
    notes: 'Dual monitor setup. USB-C and HDMI. Qty 2.',
    serial_number: 'LGM27BK000001',
  },
  {
    name: 'Trek FX 3 Disc Bike',
    brand: 'Trek',
    model: 'FX 3 Disc',
    category: 'Sports',
    condition: 'good' as const,
    quantity: 1,
    purchase_price: 899,
    purchase_date: '2022-04-05',
    location_name: 'Garage',
    tags: ['bicycle', 'fitness', 'outdoor'],
    notes: 'Size M. Last service: Jan 2024. Due for tune-up.',
    serial_number: 'WTU221B05523',
  },
  {
    name: 'iPad Pro 12.9" (M2)',
    brand: 'Apple',
    model: 'MNXW3LL/A',
    category: 'Electronics',
    condition: 'new' as const,
    quantity: 1,
    purchase_price: 1099,
    purchase_date: '2024-01-10',
    warranty_expiry_date: '2025-01-10',
    location_name: 'Living Room',
    tags: ['tablet', 'apple'],
    notes: 'With Magic Keyboard and Apple Pencil 2. Warranty until Jan 2025.',
    serial_number: 'DMPH3HK1Q6MY',
  },
  {
    name: 'Weber Spirit II Gas Grill',
    brand: 'Weber',
    model: 'Spirit II E-310',
    category: 'Appliances',
    condition: 'fair' as const,
    quantity: 1,
    purchase_price: 499,
    purchase_date: '2019-06-20',
    location_name: 'Backyard',
    tags: ['grill', 'outdoor', 'cooking'],
    notes: 'Needs new burner covers. Scheduled cleaning for spring.',
  },
  {
    name: 'Nikon Z50 Camera',
    brand: 'Nikon',
    model: 'Z50',
    category: 'Electronics',
    condition: 'excellent' as const,
    quantity: 1,
    purchase_price: 856,
    purchase_date: '2023-03-14',
    warranty_expiry_date: '2024-03-14',
    location_name: 'Home Office',
    tags: ['camera', 'photography'],
    notes: 'Mirrorless APS-C. With 16-50mm kit lens. Spare battery in drawer.',
    serial_number: 'NK6019433',
  },
];

/**
 * Insert sample items into the user's workspace.
 * Marks each item with a sample tag for later cleanup.
 */
export async function loadSampleData(workspaceId: string): Promise<{ count: number; error?: string }> {
  try {
    const insertItems = SAMPLE_ITEMS.map(item => ({
      workspace_id: workspaceId,
      name: item.name,
      brand: item.brand ?? null,
      model: item.model ?? null,
      // category_id left null — sample data uses display names, not UUIDs
      condition: item.condition,
      quantity: item.quantity,
      purchase_price: item.purchase_price ?? null,
      purchase_date: item.purchase_date ?? null,
      warranty_expiry_date: item.warranty_expiry_date ?? null,
      notes: (item.notes ?? '') + `\n\n[${SAMPLE_TAG}]`,
      serial_number: item.serial_number ?? null,
    }));

    const { data, error } = await supabase
      .from('items')
      .insert(insertItems)
      .select('id');

    if (error) return { count: 0, error: error.message };
    return { count: data?.length ?? 0 };
  } catch (e: any) {
    return { count: 0, error: e?.message ?? 'Unknown error' };
  }
}

/**
 * Remove all sample items from the workspace.
 */
export async function clearSampleData(workspaceId: string): Promise<{ count: number; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('items')
      .delete()
      .eq('workspace_id', workspaceId)
      .like('notes', `%[${SAMPLE_TAG}]%`)
      .select('id');

    if (error) return { count: 0, error: error.message };
    return { count: data?.length ?? 0 };
  } catch (e: any) {
    return { count: 0, error: e?.message ?? 'Unknown error' };
  }
}

/**
 * Check if sample data is currently loaded in this workspace.
 */
export async function hasSampleData(workspaceId: string): Promise<boolean> {
  const { data } = await supabase
    .from('items')
    .select('id')
    .eq('workspace_id', workspaceId)
    .like('notes', `%[${SAMPLE_TAG}]%`)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
