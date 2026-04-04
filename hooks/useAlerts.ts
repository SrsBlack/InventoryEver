import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Alert } from '../types';

export function useAlerts(workspaceId: string | undefined) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('alerts')
        .select('*, item:items(id, name, main_image_url)')
        .eq('workspace_id', workspaceId)
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false });

      if (fetchError) throw fetchError;
      const alertList = (data ?? []) as Alert[];
      setAlerts(alertList);
      setUnreadCount(alertList.filter(a => !a.is_read).length);
    } catch (err) {
      console.warn('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const markRead = useCallback(async (alertId: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', alertId);
    setAlerts(prev =>
      prev.map(a => (a.id === alertId ? { ...a, is_read: true } : a))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const resolveAlert = useCallback(async (alertId: string) => {
    await supabase
      .from('alerts')
      .update({ resolved_at: new Date().toISOString(), is_read: true })
      .eq('id', alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    if (!workspaceId) return;
    await supabase.from('alerts').update({ is_read: true }).eq('workspace_id', workspaceId);
    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    setUnreadCount(0);
  }, [workspaceId]);

  return { alerts, unreadCount, loading, fetchAlerts, markRead, resolveAlert, markAllRead };
}
