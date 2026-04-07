import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLending } from '../../hooks/useLending';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useColors } from '../../hooks/useColors';
import type { LendingRecord } from '../../types';
import { formatDistanceToNow, isPast, parseISO } from 'date-fns';

type Tab = 'active' | 'overdue' | 'history';

function LendingCard({ record, onPress, colors }: { record: LendingRecord; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  const isOverdue =
    !record.returned_at &&
    record.expected_return_date &&
    isPast(parseISO(record.expected_return_date));

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderLeftColor: isOverdue ? colors.error : colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {/* Left: item image */}
      <View style={styles.cardImageWrap}>
        {record.item?.main_image_url ? (
          <Image source={{ uri: record.item.main_image_url }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImageFallback, { backgroundColor: colors.gray200 }]}>
            <Ionicons name="cube-outline" size={20} color={colors.textTertiary} />
          </View>
        )}
      </View>

      {/* Center: details */}
      <View style={styles.cardBody}>
        <Text style={[styles.cardItemName, { color: colors.textPrimary }]} numberOfLines={1}>{record.item?.name ?? 'Unknown Item'}</Text>
        <View style={styles.cardRow}>
          <Ionicons name="person-outline" size={12} color={colors.textTertiary} style={{ marginRight: 4 }} />
          <Text style={[styles.cardBorrower, { color: colors.textSecondary }]}>{record.borrower_name}</Text>
        </View>
        <View style={styles.cardRow}>
          <Ionicons name="calendar-outline" size={12} color={colors.textTertiary} style={{ marginRight: 4 }} />
          <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
            Lent {formatDistanceToNow(parseISO(record.lent_at), { addSuffix: true })}
          </Text>
        </View>
        {record.expected_return_date && !record.returned_at && (
          <Text style={[styles.cardDue, { color: isOverdue ? colors.error : colors.warning }]}>
            {isOverdue
              ? `Overdue since ${record.expected_return_date}`
              : `Due ${record.expected_return_date}`}
          </Text>
        )}
        {record.returned_at && (
          <Text style={[styles.cardReturned, { color: colors.success }]}>
            Returned {formatDistanceToNow(parseISO(record.returned_at), { addSuffix: true })}
          </Text>
        )}
      </View>

      {/* Right: qty badge + chevron */}
      <View style={styles.cardRight}>
        {record.quantity_lent > 1 && (
          <View style={[styles.qtyBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.qtyText}>×{record.quantity_lent}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

export default function LendingScreen() {
  const router = useRouter();
  const colors = useColors();
  const { activeWorkspace } = useWorkspaceContext();
  const { active, overdue, history, loading, refresh } = useLending(activeWorkspace?.id);
  const [tab, setTab] = useState<Tab>('active');

  const data = tab === 'active' ? active : tab === 'overdue' ? overdue : history;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Lending Tracker',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', letterSpacing: 1 },
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push('/lending/lend')} style={{ marginRight: 16 }}>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Summary bar */}
        <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{active.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>ACTIVE</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, overdue.length > 0 && { color: colors.error }]}>
              {overdue.length}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>OVERDUE</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{history.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>RETURNED</Text>
          </View>
        </View>

        {/* Tab bar */}
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
          {(['active', 'overdue', 'history'] as Tab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
              onPress={() => setTab(t)}
            >
              {t === 'overdue' && overdue.length > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: colors.error }]}>
                  <Text style={styles.tabBadgeText}>{overdue.length}</Text>
                </View>
              )}
              <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.textTertiary }]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={data}
          keyExtractor={r => r.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <LendingCard
              record={item}
              colors={colors}
              onPress={() => router.push(`/lending/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.empty}>
                <Ionicons name="hand-left-outline" size={48} color={colors.textTertiary} style={{ marginBottom: 12 }} />
                <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>
                  {tab === 'active' ? 'Nothing currently lent out' : tab === 'overdue' ? 'No overdue items' : 'No lending history'}
                </Text>
                {tab === 'active' && (
                  <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: colors.primary }]} onPress={() => router.push('/lending/lend')}>
                    <Text style={styles.emptyBtnText}>Lend an Item</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : null
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 1.5, marginTop: 2 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabBadge: {
    position: 'absolute',
    top: 8,
    right: 24,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  list: { padding: 16, gap: 10 },
  card: {
    flexDirection: 'row',
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    alignItems: 'center',
    gap: 12,
  },
  cardImageWrap: { width: 44, height: 44, borderRadius: 4, overflow: 'hidden' },
  cardImage: { width: '100%', height: '100%' },
  cardImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 3 },
  cardItemName: { fontSize: 14, fontWeight: '700' },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardBorrower: { fontSize: 13 },
  cardDate: { fontSize: 12 },
  cardDue: { fontSize: 12, fontWeight: '500' },
  cardReturned: { fontSize: 12 },
  cardRight: { alignItems: 'center', gap: 6 },
  qtyBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyText: { fontSize: 11, color: '#fff', fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 15, textAlign: 'center' },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  tabText: { fontSize: 11, fontWeight: '600', letterSpacing: 1 },
});
