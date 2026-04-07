import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useCollections, useCollectionItems } from '../../hooks/useCollections';
import { useColors } from '../../hooks/useColors';
import { Spinner } from '../../components/ui/Spinner';
import { formatPrice } from '../../lib/utils';
import type { Item } from '../../types';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { collections, deleteCollection } = useCollections(activeWorkspace?.id);
  const collection = collections.find(c => c.id === id);

  const { items, loading, fetchItems, removeItem } = useCollectionItems(
    id,
    collection?.collection_type ?? 'manual',
    collection?.smart_rules,
    activeWorkspace?.id,
  );
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const handleRemoveItem = (item: Item) => {
    if (collection?.collection_type !== 'manual') return;
    Alert.alert(
      'Remove from Collection',
      `Remove "${item.name}" from this collection?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeItem(item.id) },
      ],
    );
  };

  const handleDeleteCollection = () => {
    if (!collection) return;
    Alert.alert(
      'Delete Collection',
      `Delete "${collection.name}"? Items will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(collection.id);
            router.back();
          },
        },
      ],
    );
  };

  if (!collection) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>COLLECTION</Text>
          <View style={{ width: 32 }} />
        </View>
        <Spinner label="Loading…" />
      </SafeAreaView>
    );
  }

  const smartRulesSummary = buildSmartRulesSummary(collection.smart_rules);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>{collection.name.toUpperCase()}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => router.push(`/collections/manage?id=${collection.id}` as `/${string}`)}
            style={styles.headerBtn}
          >
            <Ionicons name="pencil" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteCollection} style={styles.headerBtn}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collection Meta */}
      <View style={[styles.metaRow, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: collection.color_hex }]}>
        <Text style={styles.metaEmoji}>{collection.icon_emoji}</Text>
        <View style={styles.metaInfo}>
          <View style={styles.metaTitleRow}>
            <Text style={[styles.metaName, { color: colors.textPrimary }]}>{collection.name}</Text>
            <View style={[
              styles.typeBadge,
              { backgroundColor: collection.collection_type === 'smart' ? colors.primary + '22' : colors.gray200 },
            ]}>
              <Text style={[
                styles.typeBadgeText,
                { color: collection.collection_type === 'smart' ? colors.primary : colors.textTertiary },
              ]}>
                {collection.collection_type === 'smart' ? '⚡ SMART' : '✋ MANUAL'}
              </Text>
            </View>
          </View>
          {collection.description ? (
            <Text style={[styles.metaDesc, { color: colors.textSecondary }]}>{collection.description}</Text>
          ) : null}
          {collection.collection_type === 'smart' && smartRulesSummary ? (
            <Text style={[styles.rulesPreview, { color: colors.textTertiary }]} numberOfLines={2}>{smartRulesSummary}</Text>
          ) : null}
        </View>
      </View>

      {/* Count bar */}
      <View style={styles.countBar}>
        <Text style={[styles.countText, { color: colors.textTertiary }]}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
        {collection.collection_type === 'manual' && (
          <TouchableOpacity
            style={[styles.addItemBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}
            onPress={() => router.push(`/collections/add-items?id=${collection.id}` as `/${string}`)}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={[styles.addItemBtnText, { color: colors.primary }]}>Add Items</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <Spinner label="Loading items…" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {collection.collection_type === 'smart'
                  ? 'No items match these rules'
                  : 'No items added yet'}
              </Text>
              {collection.collection_type === 'manual' && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.push(`/collections/add-items?id=${collection.id}` as `/${string}`)}
                >
                  <Text style={styles.emptyBtnText}>Add Items</Text>
                </TouchableOpacity>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.itemRow,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderLeftColor: item.category?.color_hex ?? colors.primary,
                },
              ]}
              onPress={() => router.push(`/item/${item.id}` as `/${string}`)}
              onLongPress={() => collection.collection_type === 'manual' ? handleRemoveItem(item) : undefined}
              activeOpacity={0.8}
            >
              <View style={[styles.itemEmoji, { backgroundColor: colors.gray200 }]}>
                {item.category?.icon_emoji ? (
                  <Text>{item.category.icon_emoji}</Text>
                ) : (
                  <Ionicons name="cube-outline" size={18} color={colors.gray500} />
                )}
              </View>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: colors.textTertiary }]}>
                  {item.category?.name ?? 'Uncategorized'}{item.condition ? ` · ${item.condition}` : ''}
                </Text>
              </View>
              <View style={styles.itemRight}>
                {item.purchase_price !== undefined && (
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>{formatPrice(item.purchase_price, item.currency)}</Text>
                )}
                {collection.collection_type === 'manual' && (
                  <TouchableOpacity
                    onPress={() => handleRemoveItem(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={styles.removeBtn}
                  >
                    <Ionicons name="remove-circle-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function buildSmartRulesSummary(rules?: Record<string, any> | null): string {
  if (!rules) return '';
  const parts: string[] = [];
  if (rules.condition) parts.push(`Condition: ${rules.condition}`);
  if (rules.category_id) parts.push('Category filtered');
  if (rules.location_id) parts.push('Location filtered');
  if (rules.min_price !== undefined || rules.max_price !== undefined) {
    if (rules.min_price !== undefined && rules.max_price !== undefined) {
      parts.push(`$${rules.min_price}–$${rules.max_price}`);
    } else if (rules.max_price !== undefined) {
      parts.push(`Under $${rules.max_price}`);
    } else {
      parts.push(`Over $${rules.min_price}`);
    }
  }
  if (rules.warranty_status?.length) parts.push(`Warranty: ${rules.warranty_status.join(', ')}`);
  if (rules.search) parts.push(`Name: "${rules.search}"`);
  return parts.join(' · ');
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    margin: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  metaEmoji: { fontSize: 28, marginTop: 2 },
  metaInfo: { flex: 1, gap: 4 },
  metaTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  metaName: { fontSize: 17, fontWeight: '700' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  metaDesc: { fontSize: 13 },
  rulesPreview: { fontSize: 12, fontStyle: 'italic' },
  countBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  countText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  addItemBtnText: { fontSize: 12, fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 10,
    gap: 10,
  },
  itemEmoji: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 2 },
  itemRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemPrice: { fontSize: 13, fontWeight: '700' },
  removeBtn: { padding: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 14 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
