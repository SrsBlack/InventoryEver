/**
 * useOfflineSync — tracks online/offline state and triggers sync on reconnect.
 *
 * Uses fetch() to probe connectivity (works on all Expo targets including web).
 * No additional native packages required.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncPendingOps, refreshCacheForWorkspace } from '../lib/sync';
import { getQueueLength } from '../lib/offline';

const PROBE_URL = 'https://www.gstatic.com/generate_204'; // tiny Google endpoint
const PROBE_INTERVAL_MS = 15_000; // check every 15 s when app is active

async function isOnline(): Promise<boolean> {
  try {
    const res = await fetch(PROBE_URL, { method: 'HEAD', cache: 'no-store' });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

interface UseOfflineSyncOptions {
  workspaceId: string | undefined;
  /** Called after a successful sync so the UI can refetch items */
  onSyncComplete?: () => void;
}

export interface OfflineSyncState {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  triggerSync: () => Promise<void>;
}

export function useOfflineSync({
  workspaceId,
  onSyncComplete,
}: UseOfflineSyncOptions): OfflineSyncState {
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const prevOnline = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const refreshPendingCount = useCallback(async () => {
    const count = await getQueueLength();
    setPendingCount(count);
  }, []);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setLastSyncError(null);
    try {
      const result = await syncPendingOps();
      if (result.synced > 0 && workspaceId) {
        await refreshCacheForWorkspace(workspaceId);
        onSyncComplete?.();
      }
      if (result.errors.length > 0) {
        setLastSyncError(result.errors[0]);
      }
      await refreshPendingCount();
    } catch (err) {
      setLastSyncError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, workspaceId, onSyncComplete, refreshPendingCount]);

  const checkAndSync = useCallback(async () => {
    const nowOnline = await isOnline();
    setOnline(nowOnline);

    // Came back online → trigger sync
    if (nowOnline && !prevOnline.current) {
      await triggerSync();
    }
    prevOnline.current = nowOnline;
  }, [triggerSync]);

  // Poll while app is active
  useEffect(() => {
    checkAndSync();
    intervalRef.current = setInterval(checkAndSync, PROBE_INTERVAL_MS);

    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      appState.current = nextState;
      if (wasBackground && nextState === 'active') {
        // App foregrounded — check immediately
        checkAndSync();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      appStateSub.remove();
    };
  }, [checkAndSync]);

  // Refresh pending count on mount and after each sync
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount, isSyncing]);

  return { isOnline: online, pendingCount, isSyncing, lastSyncError, triggerSync };
}
