import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { MaintenanceLog } from '../types';

interface MaintenanceWithItem extends MaintenanceLog {
  item?: { id: string; name: string; main_image_url?: string };
}

export function useMaintenance(workspaceId: string | null | undefined) {
  const [upcoming, setUpcoming] = useState<MaintenanceWithItem[]>([]);
  const [past, setPast] = useState<MaintenanceWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaintenance = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    try {
      // Upcoming: has next_scheduled_date >= today
      const { data: upcomingData, error: upcomingErr } = await supabase
        .from('maintenance_logs')
        .select('*, items!inner(id, name, main_image_url, workspace_id)')
        .eq('items.workspace_id', workspaceId)
        .gte('next_scheduled_date', today)
        .order('next_scheduled_date', { ascending: true })
        .limit(50);

      if (upcomingErr) throw upcomingErr;

      // Recent past: performed in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
      const { data: pastData, error: pastErr } = await supabase
        .from('maintenance_logs')
        .select('*, items!inner(id, name, main_image_url, workspace_id)')
        .eq('items.workspace_id', workspaceId)
        .gte('performed_at', thirtyDaysAgo)
        .order('performed_at', { ascending: false })
        .limit(50);

      if (pastErr) throw pastErr;

      const upcomingList = (upcomingData || []).map(d => ({ ...d, item: d.items }));
      const pastList = (pastData || []).map(d => ({ ...d, item: d.items }));

      setUpcoming(upcomingList);
      setPast(pastList);

      try {
        await AsyncStorage.setItem(`offline:maintenance:upcoming:${workspaceId}`, JSON.stringify(upcomingList));
        await AsyncStorage.setItem(`offline:maintenance:past:${workspaceId}`, JSON.stringify(pastList));
      } catch {
        // Storage unavailable — skip cache write
      }
    } catch (err) {
      console.warn('Failed to fetch maintenance data:', err);
      try {
        const [rawUpcoming, rawPast] = await Promise.all([
          AsyncStorage.getItem(`offline:maintenance:upcoming:${workspaceId}`),
          AsyncStorage.getItem(`offline:maintenance:past:${workspaceId}`),
        ]);
        if (rawUpcoming) setUpcoming(JSON.parse(rawUpcoming) as MaintenanceWithItem[]);
        if (rawPast) setPast(JSON.parse(rawPast) as MaintenanceWithItem[]);
      } catch {
        // Cache read failed — leave state as-is
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  useEffect(() => {
    if (!workspaceId) return;
    // maintenance_logs links to items via item_id; filter realtime by item workspace
    // We refetch on any change to maintenance_logs for items in this workspace
    const sub = supabase
      .channel(`maintenance:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_logs',
          filter: `item_id=in.(select id from items where workspace_id=eq.${workspaceId})`,
        },
        () => {
          fetchMaintenance();
        }
      )
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [workspaceId, fetchMaintenance]);

  return { upcoming, past, loading, refresh: fetchMaintenance };
}
