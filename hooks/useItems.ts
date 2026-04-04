import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import type { Item, ItemFilters, WarrantyStatus } from '../types';
import { Config } from '../constants/config';

function getWarrantyStatus(warrantyExpiryDate: string | undefined | null): WarrantyStatus {
  if (!warrantyExpiryDate) return 'none';
  const expiry = new Date(warrantyExpiryDate);
  const now = new Date();
  const daysUntilExpiry = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring';
  return 'valid';
}

function applyClientFilters(items: Item[], filters: ItemFilters | undefined): Item[] {
  if (!filters) return items;
  let result = items;

  if (filters.tag_ids && filters.tag_ids.length > 0) {
    result = result.filter(item => {
      const itemTagIds = (item as Item & { item_tags?: { tag_id: string }[] }).item_tags?.map(t => t.tag_id) ?? [];
      return filters.tag_ids!.every(tid => itemTagIds.includes(tid));
    });
  }

  if (filters.warranty_status && filters.warranty_status.length > 0) {
    result = result.filter(item => {
      const status = getWarrantyStatus(item.warranty_expiry_date);
      return filters.warranty_status!.includes(status);
    });
  }

  return result;
}

export function useItems(workspaceId: string | undefined, filters?: ItemFilters) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const buildQuery = useCallback(() => {
    if (!workspaceId) return null;

    let query = supabase
      .from('items')
      .select(`
        *,
        category:categories(id, name, icon_emoji, color_hex),
        images:item_images(id, image_url, image_type, sort_order),
        item_tags(tag_id)
      `)
      .eq('workspace_id', workspaceId);

    if (filters?.search) {
      query = query.ilike('name', `%${filters.search}%`);
    }
    if (filters?.category_id) {
      query = query.eq('category_id', filters.category_id);
    }
    if (filters?.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    if (filters?.condition) {
      query = query.eq('condition', filters.condition);
    }
    if (filters?.min_price !== undefined) {
      query = query.gte('purchase_price', filters.min_price);
    }
    if (filters?.max_price !== undefined) {
      query = query.lte('purchase_price', filters.max_price);
    }
    if (filters?.purchase_date_from) {
      query = query.gte('purchase_date', filters.purchase_date_from);
    }
    if (filters?.purchase_date_to) {
      query = query.lte('purchase_date', filters.purchase_date_to);
    }

    const sortBy = filters?.sort_by ?? 'created_at';
    const sortOrder = filters?.sort_order ?? 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    return query;
  }, [workspaceId, filters]);

  const fetchItems = useCallback(async (resetPage = true) => {
    if (!workspaceId) { setLoading(false); return; }
    const currentPage = resetPage ? 0 : page;
    if (resetPage) setPage(0);

    setLoading(true);
    setError(null);

    try {
      const query = buildQuery();
      if (!query) return;

      const { data, error: fetchError } = await query
        .range(
          currentPage * Config.itemsPerPage,
          (currentPage + 1) * Config.itemsPerPage - 1
        );

      if (fetchError) throw fetchError;

      const newItems = applyClientFilters((data ?? []) as Item[], filters);
      if (resetPage) {
        setItems(newItems);
      } else {
        setItems(prev => [...prev, ...newItems]);
      }
      setHasMore((data ?? []).length === Config.itemsPerPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, [workspaceId, buildQuery, page]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);

    try {
      const query = buildQuery();
      if (!query) return;

      const { data, error: fetchError } = await query
        .range(nextPage * Config.itemsPerPage, (nextPage + 1) * Config.itemsPerPage - 1);

      if (fetchError) throw fetchError;
      const newItems = applyClientFilters((data ?? []) as Item[], filters);
      setItems(prev => [...prev, ...newItems]);
      setHasMore((data ?? []).length === Config.itemsPerPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more items');
    } finally {
      setLoading(false);
    }
  }, [hasMore, loading, page, buildQuery]);

  // Real-time subscription
  useEffect(() => {
    if (!workspaceId) return;

    fetchItems(true);

    const subscription = supabase
      .channel(`items:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items', filter: `workspace_id=eq.${workspaceId}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [payload.new as Item, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev =>
              prev.map(item => (item.id === (payload.new as Item).id ? (payload.new as Item) : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(item => item.id !== (payload.old as Item).id));
          }
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [workspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const addItem = useCallback(async (itemData: Partial<Item>): Promise<Item> => {
    const { data, error: insertError } = await supabase
      .from('items')
      .insert([{ ...itemData, workspace_id: workspaceId }])
      .select()
      .single();

    if (insertError) throw insertError;
    analytics.track('item_added', {
      category: itemData.category_id,
      has_price: !!itemData.purchase_price,
    });
    return data as Item;
  }, [workspaceId]);

  const updateItem = useCallback(async (id: string, updates: Partial<Item>): Promise<Item> => {
    const { data, error: updateError } = await supabase
      .from('items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;
    analytics.track('item_updated', { item_id: id });
    return data as Item;
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    const { error: deleteError } = await supabase.from('items').delete().eq('id', id);
    if (deleteError) throw deleteError;
    analytics.track('item_deleted', { item_id: id });
  }, []);

  return {
    items,
    loading,
    error,
    hasMore,
    fetchItems,
    loadMore,
    addItem,
    updateItem,
    deleteItem,
  };
}
