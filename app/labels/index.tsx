import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { useColors } from '../../hooks/useColors';
import type { Item } from '../../types';

export default function LabelsScreen() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { items, loading } = useItems(activeWorkspace?.id);
  const colors = useColors();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);

  const filtered = search.trim()
    ? items.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.brand?.toLowerCase().includes(search.toLowerCase()) ||
        i.location?.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(i => i.id)));
    }
  };

  const handlePrint = () => {
    if (selected.size === 0) {
      Alert.alert('No items selected', 'Tap items to select them, then tap Print.');
      return;
    }
    const ids = Array.from(selected).join(',');
    router.push(`/labels/print?ids=${encodeURIComponent(ids)}`);
  };

  const handleSinglePrint = (item: Item) => {
    router.push(`/labels/print?ids=${encodeURIComponent(item.id)}`);
  };

  const renderItem = ({ item }: { item: Item }) => {
    const isSelected = selected.has(item.id);
    return (
      <TouchableOpacity
        style={[
          styles.row,
          { backgroundColor: colors.surface, borderColor: colors.border },
          isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
        ]}
        onPress={() => selectMode ? toggleSelect(item.id) : handleSinglePrint(item)}
        onLongPress={() => { setSelectMode(true); toggleSelect(item.id); }}
        activeOpacity={0.7}
      >
        {/* Thumbnail */}
        <View style={styles.thumb}>
          {item.main_image_url ? (
            <Image source={{ uri: item.main_image_url }} style={styles.thumbImg} />
          ) : (
            <View style={[styles.thumbPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={{ fontSize: 20 }}>📦</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.rowInfo}>
          <Text style={[styles.rowName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.rowSub, { color: colors.textSecondary }]} numberOfLines={1}>
            {[item.brand, item.model].filter(Boolean).join(' · ') || item.condition}
          </Text>
          {item.location_data?.full_path || item.location ? (
            <Text style={[styles.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
              📍 {item.location_data?.full_path ?? item.location}
            </Text>
          ) : null}
        </View>

        {/* Right side */}
        {selectMode ? (
          <View style={[
            styles.checkbox,
            { borderColor: colors.textSecondary },
            isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
          ]}>
            {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
          </View>
        ) : (
          <TouchableOpacity onPress={() => handleSinglePrint(item)} style={styles.printBtn} hitSlop={8}>
            <Ionicons name="print-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>QR / LABELS</Text>
        {selectMode ? (
          <TouchableOpacity onPress={() => { setSelectMode(false); setSelected(new Set()); }} style={styles.headerAction}>
            <Text style={[styles.headerActionText, { color: colors.primary }]}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => setSelectMode(true)} style={styles.headerAction}>
            <Ionicons name="checkbox-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search items..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Batch toolbar */}
      {selectMode && (
        <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleSelectAll} style={styles.toolbarBtn}>
            <Ionicons
              name={selected.size === filtered.length ? 'checkbox' : 'square-outline'}
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.toolbarBtnText, { color: colors.primary }]}>
              {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
          <View style={styles.toolbarRight}>
            <Text style={[styles.selectedCount, { color: colors.textSecondary }]}>{selected.size} selected</Text>
            <TouchableOpacity
              style={[styles.printAllBtn, { backgroundColor: colors.primary }, selected.size === 0 && { opacity: 0.4 }]}
              onPress={handlePrint}
              disabled={selected.size === 0}
            >
              <Ionicons name="print" size={16} color="#fff" />
              <Text style={styles.printAllBtnText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info banner */}
      {!selectMode && (
        <View style={[styles.infoBanner, { borderBottomColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={15} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>Tap an item to print its label · Long press to select multiple</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="qr-code-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>No items found</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Add items to your inventory to generate labels.</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  headerAction: { padding: 4 },
  headerActionText: { fontSize: 14, fontWeight: '600' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 10 },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  toolbarBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolbarBtnText: { fontSize: 13, fontWeight: '600' },
  toolbarRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedCount: { fontSize: 13 },
  printAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
  },
  printAllBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  infoText: { fontSize: 11 },

  list: { padding: 12, gap: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },

  thumb: { width: 48, height: 48, borderRadius: 6, overflow: 'hidden' },
  thumbImg: { width: 48, height: 48 },
  thumbPlaceholder: {
    width: 48, height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },

  rowInfo: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  rowSub: { fontSize: 12, marginBottom: 1 },
  rowMeta: { fontSize: 11 },

  checkbox: {
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  printBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '700' },
  emptySubtext: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
});
