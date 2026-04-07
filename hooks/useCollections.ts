import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { Collection, CollectionItem, SmartRules, Item } from '../types';

export function useCollections(workspaceId: string | undefined) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('collections')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (err) throw err;
      const list = data ?? [];
      setCollections(list);
      try {
        await AsyncStorage.setItem(`offline:collections:${workspaceId}`, JSON.stringify(list));
      } catch {
        // Storage unavailable — skip cache write
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
      try {
        const raw = await AsyncStorage.getItem(`offline:collections:${workspaceId}`);
        if (raw) setCollections(JSON.parse(raw) as Collection[]);
      } catch {
        // Cache read failed — leave state as-is
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  // Realtime subscription
  useEffect(() => {
    if (!workspaceId) return;
    const sub = supabase
      .channel(`collections:${workspaceId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'collections',
        filter: `workspace_id=eq.${workspaceId}`,
      }, payload => {
        if (payload.eventType === 'INSERT') {
          setCollections(prev => [payload.new as Collection, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setCollections(prev =>
            prev.map(c => c.id === (payload.new as Collection).id ? payload.new as Collection : c),
          );
        } else if (payload.eventType === 'DELETE') {
          setCollections(prev => prev.filter(c => c.id !== (payload.old as Collection).id));
        }
      })
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [workspaceId]);

  const createCollection = useCallback(async (
    data: {
      name: string;
      description?: string;
      icon_emoji?: string;
      color_hex?: string;
      collection_type: 'manual' | 'smart';
      smart_rules?: SmartRules;
    },
    userId: string,
  ): Promise<Collection | null> => {
    if (!workspaceId) return null;
    const { data: created, error: err } = await supabase
      .from('collections')
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        description: data.description ?? null,
        icon_emoji: data.icon_emoji ?? '📚',
        color_hex: data.color_hex ?? '#8B5CF6',
        collection_type: data.collection_type,
        smart_rules: data.collection_type === 'smart' ? (data.smart_rules ?? null) : null,
        created_by: userId,
      })
      .select()
      .single();
    if (err) { setError(err.message); return null; }
    return created;
  }, [workspaceId]);

  const updateCollection = useCallback(async (
    id: string,
    updates: Partial<Pick<Collection, 'name' | 'description' | 'icon_emoji' | 'color_hex' | 'smart_rules'>>,
  ): Promise<boolean> => {
    const { error: err } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id);
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  const deleteCollection = useCallback(async (id: string): Promise<boolean> => {
    const { error: err } = await supabase
      .from('collections')
      .delete()
      .eq('id', id);
    if (err) { setError(err.message); return false; }
    return true;
  }, []);

  return {
    collections,
    loading,
    error,
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
  };
}

// ── Hook for items in a single collection ─────────────────────────────────────

export function useCollectionItems(collectionId: string | undefined, collectionType: 'manual' | 'smart', smartRules?: SmartRules, workspaceId?: string) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stable serialised reference — avoids re-creating fetchItems on every render
  // when the caller passes an inline object literal for smartRules.
  const smartRulesKey = useRef(JSON.stringify(smartRules));
  useEffect(() => {
    smartRulesKey.current = JSON.stringify(smartRules);
  });

  const fetchItems = useCallback(async () => {
    if (!collectionId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      if (collectionType === 'manual') {
        // Fetch items via join table
        const { data, error: err } = await supabase
          .from('collection_items')
          .select(`
            item_id,
            sort_order,
            added_at,
            item:items(
              *,
              category:categories(id, name, icon_emoji, color_hex),
              location_data:locations(id, name, full_path, icon_emoji, color_hex),
              images:item_images(id, image_url, image_type, sort_order)
            )
          `)
          .eq('collection_id', collectionId)
          .order('sort_order', { ascending: true });
        if (err) throw err;
        setItems((data ?? []).map((row: any) => row.item).filter(Boolean));
      } else if (collectionType === 'smart' && workspaceId) {
        // Fetch items matching smart rules
        let query = supabase
          .from('items')
          .select(`
            *,
            category:categories(id, name, icon_emoji, color_hex),
            location_data:locations(id, name, full_path, icon_emoji, color_hex),
            images:item_images(id, image_url, image_type, sort_order)
          `)
          .eq('workspace_id', workspaceId);

        const rules = smartRules ?? {};
        if (rules.search) query = query.ilike('name', `%${rules.search}%`);
        if (rules.category_id) query = query.eq('category_id', rules.category_id);
        if (rules.location_id) query = query.eq('location_id', rules.location_id);
        if (rules.condition) query = query.eq('condition', rules.condition);
        if (rules.min_price !== undefined) query = query.gte('purchase_price', rules.min_price);
        if (rules.max_price !== undefined) query = query.lte('purchase_price', rules.max_price);
        if (rules.purchase_date_from) query = query.gte('purchase_date', rules.purchase_date_from);
        if (rules.purchase_date_to) query = query.lte('purchase_date', rules.purchase_date_to);

        query = query.order('created_at', { ascending: false });

        const { data, error: err } = await query;
        if (err) throw err;

        // Client-side warranty status filter
        let result: Item[] = data ?? [];
        if (rules.warranty_status && rules.warranty_status.length > 0) {
          result = result.filter(item => {
            const status = getWarrantyStatus(item.warranty_expiry_date);
            return rules.warranty_status!.includes(status);
          });
        }
        setItems(result);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load collection items');
    } finally {
      setLoading(false);
    }
  }, [collectionId, collectionType, workspaceId, smartRulesKey.current]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!collectionId || collectionType !== 'manual') return false;
    const { error: err } = await supabase
      .from('collection_items')
      .insert({ collection_id: collectionId, item_id: itemId });
    if (err) { setError(err.message); return false; }
    await fetchItems();
    return true;
  }, [collectionId, collectionType, fetchItems]);

  const removeItem = useCallback(async (itemId: string): Promise<boolean> => {
    if (!collectionId || collectionType !== 'manual') return false;
    const { error: err } = await supabase
      .from('collection_items')
      .delete()
      .eq('collection_id', collectionId)
      .eq('item_id', itemId);
    if (err) { setError(err.message); return false; }
    setItems(prev => prev.filter(i => i.id !== itemId));
    return true;
  }, [collectionId, collectionType]);

  return { items, loading, error, fetchItems, addItem, removeItem };
}

function getWarrantyStatus(warrantyExpiryDate: string | undefined | null): string {
  if (!warrantyExpiryDate) return 'none';
  const expiry = new Date(warrantyExpiryDate);
  const now = new Date();
  const days = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring';
  return 'valid';
}
