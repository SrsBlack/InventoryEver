import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useCollections } from '../../hooks/useCollections';
import { useColors } from '../../hooks/useColors';
import { Spinner } from '../../components/ui/Spinner';
import type { Collection } from '../../types';

export default function CollectionsIndexScreen() {
  const router = useRouter();
  const colors = useColors();
  const { activeWorkspace } = useWorkspaceContext();
  const { collections, loading, fetchCollections, deleteCollection } = useCollections(activeWorkspace?.id);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCollections();
    setRefreshing(false);
  };

  const handleDelete = (col: Collection) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${col.name}"? Items inside will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCollection(col.id);
          },
        },
      ],
    );
  };

  if (loading && collections.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Header onAdd={() => router.push('/collections/manage')} onBack={() => router.back()} colors={colors} />
        <Spinner label="Loading collections…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Header onAdd={() => router.push('/collections/manage')} onBack={() => router.back()} colors={colors} />
      <FlatList
        data={collections}
        keyExtractor={c => c.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="albums-outline" size={52} color={colors.gray400} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Collections Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Group your items into manual lists or smart rule-based collections.</Text>
            <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/collections/manage')}>
              <Text style={styles.emptyBtnText}>Create Collection</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item: col }) => (
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: col.color_hex }]}
            onPress={() => router.push(`/collections/${col.id}` as `/${string}`)}
            onLongPress={() => handleDelete(col)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: col.color_hex + '22' }]}>
              <Text style={styles.emoji}>{col.icon_emoji}</Text>
            </View>
            <View style={styles.cardInfo}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>{col.name}</Text>
                <View style={[
                  styles.typeBadge,
                  { backgroundColor: col.collection_type === 'smart' ? colors.primary + '22' : colors.gray200 },
                ]}>
                  <Text style={[
                    styles.typeBadgeText,
                    { color: col.collection_type === 'smart' ? colors.primary : colors.textTertiary },
                  ]}>
                    {col.collection_type === 'smart' ? 'SMART' : 'MANUAL'}
                  </Text>
                </View>
              </View>
              {col.description ? (
                <Text style={[styles.cardDesc, { color: colors.textTertiary }]} numberOfLines={1}>{col.description}</Text>
              ) : null}
              <Text style={[styles.cardCount, { color: colors.textSecondary }]}>
                {col.collection_type === 'manual'
                  ? `${col.item_count} item${col.item_count !== 1 ? 's' : ''}`
                  : 'Dynamic · tap to view'}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity
                onPress={() => router.push(`/collections/manage?id=${col.id}` as `/${string}`)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="pencil" size={16} color={colors.gray500} />
              </TouchableOpacity>
              <Ionicons name="chevron-forward" size={18} color={colors.gray500} style={styles.chevron} />
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function Header({ onAdd, onBack, colors }: { onAdd: () => void; onBack: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>COLLECTIONS</Text>
      <TouchableOpacity onPress={onAdd} style={styles.addBtn}>
        <Ionicons name="add" size={22} color={colors.primary} />
      </TouchableOpacity>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  addBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  cardInfo: { flex: 1, gap: 3 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700' },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  cardDesc: { fontSize: 12 },
  cardCount: { fontSize: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chevron: { marginLeft: 4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
