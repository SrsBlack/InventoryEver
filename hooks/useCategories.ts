import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../types';

export function useCategories(workspaceId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .or(`workspace_id.eq.${workspaceId},is_system.eq.true`)
        .order('name');
      setCategories((data || []) as Category[]);
    } catch (err) {
      console.warn('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createCategory = async (
    name: string,
    iconName: string,
    color: string,
  ): Promise<Category | null> => {
    if (!workspaceId) return null;
    try {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          workspace_id: workspaceId,
          name,
          icon_emoji: iconName,
          color_hex: color,
          is_system: false,
        })
        .select()
        .single();
      if (error) throw error;
      const created = data as Category;
      setCategories(prev =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
      );
      return created;
    } catch (err) {
      console.warn('Failed to create category:', err);
      return null;
    }
  };

  const updateCategory = async (
    id: string,
    updates: Partial<Category>,
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      await fetchCategories();
    } catch (err) {
      console.warn('Failed to update category:', err);
    }
  };

  const deleteCategory = async (id: string): Promise<void> => {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.warn('Failed to delete category:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (!workspaceId) return;
    const sub = supabase
      .channel(`categories:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'categories', filter: `workspace_id=eq.${workspaceId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            const created = payload.new as Category;
            setCategories(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setCategories(prev =>
              prev
                .map(c => (c.id === (payload.new as Category).id ? (payload.new as Category) : c))
                .sort((a, b) => a.name.localeCompare(b.name))
            );
          } else if (payload.eventType === 'DELETE') {
            const removed = payload.old as Partial<Category>;
            setCategories(prev => prev.filter(c => c.id !== removed.id));
          }
        }
      )
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [workspaceId]);

  return {
    categories,
    loading,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
