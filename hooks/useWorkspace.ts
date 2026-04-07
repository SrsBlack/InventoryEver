import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import type { Workspace } from '../types';

const ACTIVE_WORKSPACE_KEY = 'active_workspace_id';

export function useWorkspace(userId: string | undefined) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Two separate queries to avoid invalid PostgREST cross-table OR filter
      const [ownedResult, memberResult] = await Promise.all([
        supabase
          .from('workspaces')
          .select('*, workspace_members(role, user_id)')
          .eq('owner_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', userId),
      ]);

      if (ownedResult.error) throw ownedResult.error;

      const memberWorkspaceIds = (memberResult.data ?? [])
        .map((m: { workspace_id: string }) => m.workspace_id)
        .filter((id: string) => !(ownedResult.data ?? []).some((w: Workspace) => w.id === id));

      let memberWorkspaces: Workspace[] = [];
      if (memberWorkspaceIds.length > 0) {
        const { data: mwData, error: mwError } = await supabase
          .from('workspaces')
          .select('*, workspace_members(role, user_id)')
          .in('id', memberWorkspaceIds)
          .order('created_at', { ascending: true });
        if (mwError) throw mwError;
        memberWorkspaces = (mwData ?? []) as Workspace[];
      }

      const ws = [...(ownedResult.data ?? []) as Workspace[], ...memberWorkspaces];
      setWorkspaces(ws);

      // Restore active workspace from storage
      const savedId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_KEY);
      const saved = ws.find(w => w.id === savedId);
      setActiveWorkspace(saved ?? ws[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string, type: 'personal' | 'family' | 'business' = 'personal') => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error: createError } = await supabase
        .from('workspaces')
        .insert([{ name, workspace_type: type, owner_id: userId }])
        .select()
        .single();

      if (createError) throw createError;

      // Also create an owner member entry
      await supabase.from('workspace_members').insert([
        { workspace_id: data.id, user_id: userId, role: 'owner', joined_at: new Date().toISOString() },
      ]);

      analytics.track('workspace_created', { type });
      setWorkspaces(prev => [...prev, data as Workspace]);
      setActiveWorkspace(data as Workspace);
      await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, data.id);
      return data as Workspace;
    },
    [userId]
  );

  const switchWorkspace = useCallback(async (workspace: Workspace) => {
    setActiveWorkspace(workspace);
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace.id);
    analytics.track('workspace_switched', { workspace_id: workspace.id });
  }, []);

  const updateWorkspace = useCallback(async (id: string, updates: Partial<Workspace>) => {
    const { data, error: updateError } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    setWorkspaces(prev => prev.map(w => (w.id === id ? (data as Workspace) : w)));
    if (activeWorkspace?.id === id) setActiveWorkspace(data as Workspace);
    return data as Workspace;
  }, [activeWorkspace]);

  return {
    workspaces,
    activeWorkspace,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    switchWorkspace,
    updateWorkspace,
  };
}
