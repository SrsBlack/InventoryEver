import { useState, useEffect, useCallback } from 'react';
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

    // Upcoming: has next_scheduled_date >= today
    const { data: upcomingData } = await supabase
      .from('maintenance_logs')
      .select('*, items!inner(id, name, main_image_url, workspace_id)')
      .eq('items.workspace_id', workspaceId)
      .gte('next_scheduled_date', today)
      .order('next_scheduled_date', { ascending: true })
      .limit(50);

    // Recent past: performed in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const { data: pastData } = await supabase
      .from('maintenance_logs')
      .select('*, items!inner(id, name, main_image_url, workspace_id)')
      .eq('items.workspace_id', workspaceId)
      .gte('performed_at', thirtyDaysAgo)
      .order('performed_at', { ascending: false })
      .limit(50);

    setUpcoming((upcomingData || []).map(d => ({ ...d, item: d.items })));
    setPast((pastData || []).map(d => ({ ...d, item: d.items })));
    setLoading(false);
  }, [workspaceId]);

  useEffect(() => {
    fetchMaintenance();
  }, [fetchMaintenance]);

  return { upcoming, past, loading, refresh: fetchMaintenance };
}
