import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { LendingRecord, BorrowerProfile } from '../types';

export function useLending(workspaceId: string | undefined) {
  const [active, setActive] = useState<LendingRecord[]>([]);
  const [overdue, setOverdue] = useState<LendingRecord[]>([]);
  const [history, setHistory] = useState<LendingRecord[]>([]);
  const [borrowers, setBorrowers] = useState<BorrowerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    try {
      const [activeRes, historyRes, borrowersRes] = await Promise.all([
        supabase
          .from('lending_records')
          .select('*, item:items(id, name, main_image_url, condition), borrower:borrower_profiles(*)')
          .eq('workspace_id', workspaceId)
          .is('returned_at', null)
          .order('lent_at', { ascending: false }),

        supabase
          .from('lending_records')
          .select('*, item:items(id, name, main_image_url, condition), borrower:borrower_profiles(*)')
          .eq('workspace_id', workspaceId)
          .not('returned_at', 'is', null)
          .order('returned_at', { ascending: false })
          .limit(50),

        supabase
          .from('borrower_profiles')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('name'),
      ]);

      if (activeRes.error) throw activeRes.error;
      if (historyRes.error) throw historyRes.error;
      if (borrowersRes.error) throw borrowersRes.error;

      const activeRecords = (activeRes.data ?? []) as LendingRecord[];
      const historyRecords = (historyRes.data ?? []) as LendingRecord[];
      const borrowerList = (borrowersRes.data ?? []) as BorrowerProfile[];

      setActive(activeRecords);
      setOverdue(
        activeRecords.filter(
          r => r.expected_return_date && r.expected_return_date < today
        )
      );
      setHistory(historyRecords);
      setBorrowers(borrowerList);

      try {
        await AsyncStorage.setItem(`offline:lending:active:${workspaceId}`, JSON.stringify(activeRecords));
        await AsyncStorage.setItem(`offline:lending:history:${workspaceId}`, JSON.stringify(historyRecords));
        await AsyncStorage.setItem(`offline:lending:borrowers:${workspaceId}`, JSON.stringify(borrowerList));
      } catch {
        // Storage unavailable — skip cache write
      }
    } catch (err) {
      console.warn('Failed to fetch lending data:', err);
      try {
        const [rawActive, rawHistory, rawBorrowers] = await Promise.all([
          AsyncStorage.getItem(`offline:lending:active:${workspaceId}`),
          AsyncStorage.getItem(`offline:lending:history:${workspaceId}`),
          AsyncStorage.getItem(`offline:lending:borrowers:${workspaceId}`),
        ]);
        const activeRecords = rawActive ? (JSON.parse(rawActive) as LendingRecord[]) : [];
        setActive(activeRecords);
        setOverdue(
          activeRecords.filter(
            r => r.expected_return_date && r.expected_return_date < today
          )
        );
        if (rawHistory) setHistory(JSON.parse(rawHistory) as LendingRecord[]);
        if (rawBorrowers) setBorrowers(JSON.parse(rawBorrowers) as BorrowerProfile[]);
      } catch {
        // Cache read failed — leave state as-is
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Real-time subscription
  useEffect(() => {
    if (!workspaceId) return;
    const sub = supabase
      .channel(`lending:${workspaceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lending_records', filter: `workspace_id=eq.${workspaceId}` },
        () => fetchAll()
      )
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [workspaceId, fetchAll]);

  const lendItem = useCallback(async (data: {
    item_id: string;
    borrower_name: string;
    borrower_phone?: string;
    borrower_email?: string;
    quantity_lent?: number;
    expected_return_date?: string;
    condition_lent?: string;
    notes?: string;
    created_by: string;
  }): Promise<LendingRecord> => {
    // Upsert borrower profile
    let borrowerId: string | undefined;
    if (data.borrower_name) {
      const { data: existing } = await supabase
        .from('borrower_profiles')
        .select('id')
        .eq('workspace_id', workspaceId)
        .ilike('name', data.borrower_name)
        .maybeSingle();

      if (existing) {
        borrowerId = existing.id;
        await supabase
          .from('borrower_profiles')
          .update({ total_borrowed: existing.total_borrowed + 1, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        const { data: newBorrower } = await supabase
          .from('borrower_profiles')
          .insert({
            workspace_id: workspaceId,
            name: data.borrower_name,
            phone: data.borrower_phone,
            email: data.borrower_email,
            total_borrowed: 1,
          })
          .select()
          .single();
        borrowerId = newBorrower?.id;
      }
    }

    const { data: record, error } = await supabase
      .from('lending_records')
      .insert({
        workspace_id: workspaceId,
        item_id: data.item_id,
        borrower_id: borrowerId,
        borrower_name: data.borrower_name,
        borrower_phone: data.borrower_phone,
        borrower_email: data.borrower_email,
        quantity_lent: data.quantity_lent ?? 1,
        expected_return_date: data.expected_return_date,
        condition_lent: data.condition_lent,
        notes: data.notes,
        created_by: data.created_by,
      })
      .select('*, item:items(id, name, main_image_url, condition)')
      .single();

    if (error) throw error;
    await fetchAll();
    return record as LendingRecord;
  }, [workspaceId, fetchAll]);

  const markReturned = useCallback(async (
    recordId: string,
    conditionReturned?: string,
    notes?: string
  ): Promise<void> => {
    const { error } = await supabase
      .from('lending_records')
      .update({
        returned_at: new Date().toISOString(),
        condition_returned: conditionReturned,
        notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recordId);

    if (error) throw error;

    // Update borrower stats
    const record = active.find(r => r.id === recordId);
    if (record?.borrower_id) {
      const { data: borrower } = await supabase
        .from('borrower_profiles')
        .select('total_returned, overdue_count')
        .eq('id', record.borrower_id)
        .single();

      if (borrower) {
        const isOverdue = record.expected_return_date && record.expected_return_date < new Date().toISOString().split('T')[0];
        await supabase
          .from('borrower_profiles')
          .update({
            total_returned: borrower.total_returned + 1,
            overdue_count: isOverdue ? Math.max(0, borrower.overdue_count - 1) : borrower.overdue_count,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.borrower_id);
      }
    }

    await fetchAll();
  }, [active, fetchAll]);

  const deleteRecord = useCallback(async (recordId: string): Promise<void> => {
    const { error } = await supabase.from('lending_records').delete().eq('id', recordId);
    if (error) throw error;
    await fetchAll();
  }, [fetchAll]);

  return {
    active,
    overdue,
    history,
    borrowers,
    loading,
    refresh: fetchAll,
    lendItem,
    markReturned,
    deleteRecord,
  };
}
