import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
      try {
        await AsyncStorage.setItem(`offline:alerts:${workspaceId}`, JSON.stringify(alertList));
      } catch {
        // Storage unavailable — skip cache write
      }
    } catch (err) {
      console.warn('Failed to fetch alerts:', err);
      try {
        const raw = await AsyncStorage.getItem(`offline:alerts:${workspaceId}`);
        if (raw) {
          const cached = JSON.parse(raw) as Alert[];
          setAlerts(cached);
          setUnreadCount(cached.filter(a => !a.is_read).length);
        }
      } catch {
        // Cache read failed — leave state as-is
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!workspaceId) return;
    // FIX(audit-2026-05-09 #I4) — hold channel ref and use removeChannel to avoid ghost subscriptions
    const channel = supabase
      .channel(`alerts:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `workspace_id=eq.${workspaceId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            const newAlert = payload.new as Alert;
            setAlerts(prev => [newAlert, ...prev]);
            if (!newAlert.is_read) setUnreadCount(prev => prev + 1);
          } else if (payload.eventType === 'UPDATE') {
            setAlerts(prev =>
              prev.map(a => (a.id === (payload.new as Alert).id ? (payload.new as Alert) : a))
            );
            setUnreadCount(prev =>
              Math.max(0, prev + ((payload.new as Alert).is_read ? -1 : 0))
            );
          } else if (payload.eventType === 'DELETE') {
            const removed = payload.old as Partial<Alert>;
            setAlerts(prev => prev.filter(a => a.id !== removed.id));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [workspaceId]);

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
