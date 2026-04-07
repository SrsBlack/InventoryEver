import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { useCollections, useCollectionItems } from '../../hooks/useCollections';
import { useColors } from '../../hooks/useColors';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { formatPrice } from '../../lib/utils';

export default function AddItemsToCollectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id: collectionId } = useLocalSearchParams<{ id: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { collections } = useCollections(activeWorkspace?.id);
  const { items: allItems, loading: itemsLoading } = useItems(activeWorkspace?.id);
  const { items: existingItems, addItem } = useCollectionItems(collectionId, 'manual', undefined, activeWorkspace?.id);

  const collection = collections.find(c => c.id === collectionId);
  const existingItemIds = new Set(existingItems.map(i => i.id));

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase();
    return allItems.filter(
      item =>
        !existingItemIds.has(item.id) &&
        (q === '' || item.name.toLowerCase().includes(q)),
    );
  }, [allItems, search, existingItemIds]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    const ids = Array.from(selected);
    for (const itemId of ids) {
      await addItem(itemId);
    }
    setSaving(false);
    router.back();
  };

  if (itemsLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Header onBack={() => router.back()} collectionName={collection?.name} colors={colors} />
        <Spinner label="Loading items…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Header onBack={() => router.back()} collectionName={collection?.name} colors={colors} />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.gray500} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search items…"
          placeholderTextColor={colors.textTertiary}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.gray500} />
          </TouchableOpacity>
        )}
      </View>

      {selected.size > 0 && (
        <View style={styles.selectionBar}>
          <Text style={[styles.selectionText, { color: colors.primary }]}>{selected.size} selected</Text>
          <Button
            title={saving ? 'Adding…' : `Add ${selected.size} item${selected.size !== 1 ? 's' : ''}`}
            onPress={handleAdd}
            loading={saving}
            size="sm"
          />
        </View>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="cube-outline" size={40} color={colors.gray400} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {search ? 'No items match your search' : 'All items are already in this collection'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.itemRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                isSelected && { borderColor: colors.primary, backgroundColor: colors.primary + '0D' },
              ]}
              onPress={() => toggleSelect(item.id)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.checkbox,
                { borderColor: colors.border },
                isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={[styles.itemEmoji, { backgroundColor: colors.gray200 }]}>
                {item.category?.icon_emoji ? (
                  <Text>{item.category.icon_emoji}</Text>
                ) : (
                  <Ionicons name="cube-outline" size={18} color={colors.gray500} />
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: colors.textTertiary }]}>{item.category?.name ?? 'Uncategorized'}</Text>
              </View>
              {item.purchase_price !== undefined && (
                <Text style={[styles.itemPrice, { color: colors.primary }]}>{formatPrice(item.purchase_price, item.currency)}</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Header({ onBack, collectionName, colors }: { onBack: () => void; collectionName?: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
        {collectionName ? `ADD TO ${collectionName.toUpperCase()}` : 'ADD ITEMS'}
      </Text>
      <View style={{ width: 32 }} />
    </View>
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
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchIcon: {},
  searchInput: { flex: 1, fontSize: 14 },
  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  selectionText: { fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemEmoji: { width: 34, height: 34, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 1 },
  itemPrice: { fontSize: 13, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
