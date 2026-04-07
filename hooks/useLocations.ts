import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getCachedLocations, setCachedLocations, enqueue } from '../lib/offline';
import type { Location, LocationDepth } from '../types';

function buildTree(flat: Location[]): Location[] {
  const map = new Map<string, Location>();
  flat.forEach(loc => map.set(loc.id, { ...loc, children: [] }));

  const roots: Location[] = [];
  flat.forEach(loc => {
    const node = map.get(loc.id)!;
    if (loc.parent_id && map.has(loc.parent_id)) {
      const parent = map.get(loc.parent_id)!;
      parent.children = parent.children ?? [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

export function useLocations(workspaceId: string | undefined) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('locations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('depth', { ascending: true })
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      const list = (data ?? []) as Location[];
      setLocations(list);
      await setCachedLocations(workspaceId, list);
    } catch {
      const cached = await getCachedLocations(workspaceId);
      setLocations(cached);
      if (cached.length === 0) setError('Offline — no cached locations');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    fetchLocations();

    const sub = supabase
      .channel(`locations:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'locations', filter: `workspace_id=eq.${workspaceId}` },
        async payload => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const id = (payload.new as Location).id;
            const { data } = await supabase
              .from('locations')
              .select('*, parent:locations!parent_id(id, name)')
              .eq('id', id)
              .single();
            if (data) {
              setLocations(prev => {
                const exists = prev.find(l => l.id === id);
                if (exists) return prev.map(l => (l.id === id ? (data as Location) : l));
                return [...prev, data as Location];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            setLocations(prev => prev.filter(l => l.id !== (payload.old as Location).id));
          }
        }
      )
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createLocation = useCallback(async (
    name: string,
    parentId?: string,
    emoji?: string,
    color?: string,
    description?: string,
  ): Promise<Location> => {
    // Compute depth from parent
    let depth: LocationDepth = 0;
    if (parentId) {
      const parent = locations.find(l => l.id === parentId);
      depth = parent ? Math.min(parent.depth + 1, 2) as LocationDepth : 0;
    }

    const payload = {
      workspace_id: workspaceId ?? '',
      parent_id: parentId ?? null,
      name,
      icon_emoji: emoji ?? '📍',
      color_hex: color ?? '#3B82F6',
      description: description ?? null,
      depth,
      sort_order: 0,
    };

    try {
      const { data, error: insertError } = await supabase
        .from('locations')
        .insert([payload])
        .select()
        .single();

      if (insertError) throw insertError;
      const loc = data as Location;
      setLocations(prev => [...prev, loc]);
      if (workspaceId) await setCachedLocations(workspaceId, [...locations, loc]);
      return loc;
    } catch {
      // Offline — optimistic
      const tempLoc: Location = {
        ...payload,
        id: `tmp_${Date.now()}`,
        full_path: name,
        qr_code_token: `tmp_${Date.now()}`,
        item_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Location;

      setLocations(prev => [...prev, tempLoc]);
      if (workspaceId) {
        const updated = [...locations, tempLoc];
        await setCachedLocations(workspaceId, updated);
        await enqueue({ type: 'INSERT', table: 'locations', workspaceId, payload: payload as Record<string, unknown> });
      }
      return tempLoc;
    }
  }, [workspaceId, locations]);

  const updateLocation = useCallback(async (id: string, updates: Partial<Location>): Promise<void> => {
    try {
      const { error: updateError } = await supabase
        .from('locations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (updateError) throw updateError;
      setLocations(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
    } catch {
      setLocations(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
      if (workspaceId) {
        await enqueue({ type: 'UPDATE', table: 'locations', workspaceId, payload: { id, ...updates } as Record<string, unknown> });
      }
    }
  }, [workspaceId]);

  const deleteLocation = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase.from('locations').delete().eq('id', id);
      if (deleteError) throw deleteError;
      setLocations(prev => prev.filter(l => l.id !== id));
      if (workspaceId) {
        const remaining = locations.filter(l => l.id !== id);
        await setCachedLocations(workspaceId, remaining);
      }
    } catch {
      setLocations(prev => prev.filter(l => l.id !== id));
      if (workspaceId) {
        await enqueue({ type: 'DELETE', table: 'locations', workspaceId, payload: { id } });
      }
    }
  }, [workspaceId, locations]);

  const getLocationById = useCallback(
    (id: string): Location | undefined => locations.find(l => l.id === id),
    [locations]
  );

  const getChildren = useCallback(
    (parentId: string | null): Location[] =>
      locations.filter(l => l.parent_id === parentId),
    [locations]
  );

  const getAllDescendantIds = useCallback((id: string): string[] => {
    const result: string[] = [];
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = locations.filter(l => l.parent_id === current);
      children.forEach(c => {
        result.push(c.id);
        queue.push(c.id);
      });
    }
    return result;
  }, [locations]);

  const buildBreadcrumb = useCallback((id: string): Location[] => {
    const crumbs: Location[] = [];
    let current = locations.find(l => l.id === id);
    while (current) {
      crumbs.unshift(current);
      current = current.parent_id ? locations.find(l => l.id === current!.parent_id) : undefined;
    }
    return crumbs;
  }, [locations]);

  const locationTree = useMemo(() => buildTree(locations), [locations]);

  return {
    locations,
    locationTree,
    loading,
    error,
    fetchLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getLocationById,
    getChildren,
    getAllDescendantIds,
    buildBreadcrumb,
  };
}
