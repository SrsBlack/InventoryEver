/**
 * Offline cache and pending-operations queue backed by AsyncStorage.
 *
 * Cache structure:
 *   offline:items:{workspaceId}   → Item[]   (last known server state)
 *   offline:queue                 → PendingOp[]  (mutations awaiting sync)
 *   offline:last_sync             → ISO timestamp
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Item, Location } from '../types';

export type PendingOpType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface PendingOp {
  id: string;              // unique op id (timestamp + random)
  type: PendingOpType;
  table: 'items' | 'locations';
  workspaceId: string;
  payload: Record<string, unknown>;  // full row for INSERT/UPDATE, {id} for DELETE
  createdAt: string;
  retries: number;
}

const CACHE_PREFIX = 'offline:items:';
const QUEUE_KEY = 'offline:queue';
const LAST_SYNC_KEY = 'offline:last_sync';

// ── Item Cache ────────────────────────────────────────────────────────────────

export async function getCachedItems(workspaceId: string): Promise<Item[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${workspaceId}`);
    return raw ? (JSON.parse(raw) as Item[]) : [];
  } catch {
    return [];
  }
}

export async function setCachedItems(workspaceId: string, items: Item[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${CACHE_PREFIX}${workspaceId}`, JSON.stringify(items));
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // Storage full or unavailable — silently skip
  }
}

/** Merge a single updated item into the local cache without a full refetch. */
export async function upsertCachedItem(workspaceId: string, item: Item): Promise<void> {
  const cached = await getCachedItems(workspaceId);
  const idx = cached.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    cached[idx] = item;
  } else {
    cached.unshift(item);
  }
  await setCachedItems(workspaceId, cached);
}

export async function removeCachedItem(workspaceId: string, itemId: string): Promise<void> {
  const cached = await getCachedItems(workspaceId);
  await setCachedItems(workspaceId, cached.filter(i => i.id !== itemId));
}

export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

// ── Pending Operations Queue ──────────────────────────────────────────────────

export async function getQueue(): Promise<PendingOp[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as PendingOp[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: PendingOp[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueue(op: Omit<PendingOp, 'id' | 'createdAt' | 'retries'>): Promise<void> {
  const queue = await getQueue();

  // For UPDATE: if there's already a pending UPDATE for the same item, merge payloads
  if (op.type === 'UPDATE') {
    const existing = queue.findIndex(
      q => q.type === 'UPDATE' && q.table === op.table && q.payload.id === op.payload.id
    );
    if (existing >= 0) {
      queue[existing].payload = { ...queue[existing].payload, ...op.payload };
      await saveQueue(queue);
      return;
    }
  }

  // For INSERT followed by DELETE of same temp id: cancel both
  if (op.type === 'DELETE') {
    const insertIdx = queue.findIndex(
      q => q.type === 'INSERT' && q.table === op.table && q.payload.id === op.payload.id
    );
    if (insertIdx >= 0) {
      queue.splice(insertIdx, 1);
      await saveQueue(queue);
      return;
    }
  }

  queue.push({
    ...op,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
  await saveQueue(queue);
}

export async function removeFromQueue(opId: string): Promise<void> {
  const queue = await getQueue();
  await saveQueue(queue.filter(q => q.id !== opId));
}

export async function incrementRetry(opId: string): Promise<void> {
  const queue = await getQueue();
  const op = queue.find(q => q.id === opId);
  if (op) {
    op.retries += 1;
    await saveQueue(queue);
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// ── Location Cache ────────────────────────────────────────────────────────────

const LOCATIONS_CACHE_PREFIX = 'offline:locations:';

export async function getCachedLocations(workspaceId: string): Promise<Location[]> {
  try {
    const raw = await AsyncStorage.getItem(`${LOCATIONS_CACHE_PREFIX}${workspaceId}`);
    return raw ? (JSON.parse(raw) as Location[]) : [];
  } catch {
    return [];
  }
}

export async function setCachedLocations(workspaceId: string, locations: Location[]): Promise<void> {
  try {
    await AsyncStorage.setItem(`${LOCATIONS_CACHE_PREFIX}${workspaceId}`, JSON.stringify(locations));
  } catch {
    // Storage full or unavailable — silently skip
  }
}
