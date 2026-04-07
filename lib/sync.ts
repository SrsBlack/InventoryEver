/**
 * Sync engine — replays pending offline operations against Supabase.
 * Called by useOfflineSync whenever the device comes back online.
 */

import { supabase } from './supabase';
import {
  getQueue,
  removeFromQueue,
  incrementRetry,
  setCachedItems,
} from './offline';
import type { Item } from '../types';

const MAX_RETRIES = 3;

export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Process all pending operations in FIFO order.
 * Each op is attempted; on success it's removed from the queue.
 * On failure (up to MAX_RETRIES) it stays in the queue for next sync.
 */
export async function syncPendingOps(): Promise<SyncResult> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, errors: [] };

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const op of queue) {
    if (op.retries >= MAX_RETRIES) {
      // Permanently failed — drop it to avoid blocking the queue
      await removeFromQueue(op.id);
      failed++;
      errors.push(`Dropped op ${op.id} after ${MAX_RETRIES} retries: ${op.type} ${op.payload.id}`);
      continue;
    }

    try {
      switch (op.type) {
        case 'INSERT': {
          const { error } = await supabase
            .from(op.table)
            .insert([{ ...op.payload, workspace_id: op.workspaceId }]);
          if (error) throw error;
          break;
        }
        case 'UPDATE': {
          const { id, ...updates } = op.payload as { id: string; [key: string]: unknown };
          const { error } = await supabase
            .from(op.table)
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);
          if (error) throw error;
          break;
        }
        case 'DELETE': {
          const { error } = await supabase
            .from(op.table)
            .delete()
            .eq('id', (op.payload as { id: string }).id);
          if (error) throw error;
          break;
        }
      }
      await removeFromQueue(op.id);
      synced++;
    } catch (err) {
      await incrementRetry(op.id);
      failed++;
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return { synced, failed, errors };
}

/**
 * After a successful sync, refresh the local item cache for a workspace
 * from the server so it reflects resolved state.
 */
export async function refreshCacheForWorkspace(workspaceId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('items')
      .select(`
        *,
        category:categories(id, name, icon_emoji, color_hex),
        location_data:locations(id, name, full_path, icon_emoji, color_hex),
        images:item_images(id, image_url, image_type, sort_order),
        item_tags(tag_id)
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (data) {
      await setCachedItems(workspaceId, data as Item[]);
    }
  } catch {
    // Network unavailable — leave cache as-is
  }
}
