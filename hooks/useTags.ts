import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Tag } from '../types';

export function useTags(workspaceId: string | null) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTags = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('name', { ascending: true });

      if (error) throw error;
      setTags((data ?? []) as Tag[]);
    } catch (err) {
      console.warn('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createTag = async (name: string, color_hex: string): Promise<Tag | null> => {
    if (!workspaceId) return null;
    try {
      const { data, error } = await supabase
        .from('tags')
        .insert([{ workspace_id: workspaceId, name, color_hex }])
        .select()
        .single();

      if (error) throw error;
      const newTag = data as Tag;
      setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
      return newTag;
    } catch (err) {
      console.warn('Failed to create tag:', err);
      return null;
    }
  };

  const deleteTag = async (tagId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('tags').delete().eq('id', tagId);
      if (error) throw error;
      setTags(prev => prev.filter(t => t.id !== tagId));
    } catch (err) {
      console.warn('Failed to delete tag:', err);
    }
  };

  const getItemTags = async (itemId: string): Promise<Tag[]> => {
    try {
      const { data, error } = await supabase
        .from('item_tags')
        .select('tag_id, tags(*)')
        .eq('item_id', itemId);

      if (error) throw error;
      return ((data ?? []).map((row: { tags: Tag | Tag[] }) =>
        Array.isArray(row.tags) ? row.tags[0] : row.tags
      ).filter(Boolean)) as Tag[];
    } catch (err) {
      console.warn('Failed to get item tags:', err);
      return [];
    }
  };

  const addTagToItem = async (itemId: string, tagId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('item_tags')
        .insert([{ item_id: itemId, tag_id: tagId }]);
      if (error) throw error;
    } catch (err) {
      console.warn('Failed to add tag to item:', err);
    }
  };

  const removeTagFromItem = async (itemId: string, tagId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('item_tags')
        .delete()
        .eq('item_id', itemId)
        .eq('tag_id', tagId);
      if (error) throw error;
    } catch (err) {
      console.warn('Failed to remove tag from item:', err);
    }
  };

  const setItemTags = async (itemId: string, tagIds: string[]): Promise<void> => {
    try {
      // Delete existing tags for this item
      const { error: deleteError } = await supabase
        .from('item_tags')
        .delete()
        .eq('item_id', itemId);
      if (deleteError) throw deleteError;

      // Insert new tags if any
      if (tagIds.length > 0) {
        const rows = tagIds.map(tag_id => ({ item_id: itemId, tag_id }));
        const { error: insertError } = await supabase.from('item_tags').insert(rows);
        if (insertError) throw insertError;
      }
    } catch (err) {
      console.warn('Failed to set item tags:', err);
    }
  };

  useEffect(() => {
    if (workspaceId) fetchTags();
  }, [workspaceId, fetchTags]);

  return {
    tags,
    loading,
    fetchTags,
    createTag,
    deleteTag,
    getItemTags,
    addTagToItem,
    removeTagFromItem,
    setItemTags,
  };
}
