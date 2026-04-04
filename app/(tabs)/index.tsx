import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useSubscriptionContext } from '../../contexts/SubscriptionContext';
import { useItems } from '../../hooks/useItems';
import { useAlerts } from '../../hooks/useAlerts';
import { useColors } from '../../hooks/useColors';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatPrice, formatDate, warrantyStatus } from '../../lib/utils';
import { ValueByCategory } from '../../components/dashboard/ValueByCategory';
import { ConditionBreakdown } from '../../components/dashboard/ConditionBreakdown';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import type { Item } from '../../types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useAuthContext();
  const { activeWorkspace } = useWorkspaceContext();
  const { tier } = useSubscriptionContext();
  const { items, loading, fetchItems } = useItems(activeWorkspace?.id);
  const { alerts, unreadCount, fetchAlerts } = useAlerts(activeWorkspace?.id);
  const [refreshing, setRefreshing] = useState(false);
  const colors = useColors();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchItems(true),
      fetchAlerts(),
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
    setRefreshing(false);
  }, [fetchItems, fetchAlerts]);

  const totalValue = items.reduce((sum, item) => sum + (item.purchase_price ?? 0) * item.quantity, 0);
  const warrantyWarnings = items.filter(i => {
    const d = warrantyStatus(i.warranty_expiry_date);
    return d.label !== 'No warranty' && d.label !== 'Valid' && d.label !== 'Expired';
  });

  const recentItems = items.slice(0, 5);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading && items.length === 0) return <Spinner fullScreen label="Loading..." />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting}, {firstName}</Text>
            <Text style={[styles.workspaceName, { color: colors.textPrimary }]}>
              {(activeWorkspace?.name ?? 'MY WORKSPACE').toUpperCase()}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {unreadCount > 0 && (
              <TouchableOpacity
                style={[styles.alertBadge, { backgroundColor: colors.error }]}
                onPress={() => router.push('/(tabs)/alerts')}
              >
                <Text style={styles.alertBadgeText}>{unreadCount}</Text>
              </TouchableOpacity>
            )}
            <View style={styles.tierDot}>
              <View style={[styles.tierDotInner, {
                backgroundColor:
                  tier === 'business' ? colors.warning :
                  tier === 'pro' ? colors.primary : colors.gray500,
              }]} />
              <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>{tier.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.gray200, borderLeftColor: colors.primary }]}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{items.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>ITEMS</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.gray200, borderLeftColor: colors.warning }]}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{formatPrice(totalValue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>TOTAL VALUE</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.gray200, borderLeftColor: colors.accent }]}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{unreadCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>ALERTS</Text>
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>QUICK ACTIONS</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/add-item')}
          >
            <Ionicons name="add-circle" size={24} color={colors.primary} style={styles.quickActionIcon} />
            <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Add Item</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/inventory')}
          >
            <Ionicons name="search" size={24} color={colors.accent} style={styles.quickActionIcon} />
            <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Search</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: colors.border }]}
            onPress={() => router.push('/(tabs)/alerts')}
          >
            <Ionicons name="notifications" size={24} color={colors.warning} style={styles.quickActionIcon} />
            <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickAction, { borderColor: colors.border }]}
            onPress={() => router.push('/settings/maintenance')}
          >
            <Ionicons name="build" size={24} color={colors.info} style={styles.quickActionIcon} />
            <Text style={[styles.quickActionLabel, { color: colors.textSecondary }]}>Maint.</Text>
          </TouchableOpacity>
        </View>

        {/* Active Alerts */}
        {unreadCount > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACTIVE ALERTS</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/alerts')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {alerts.slice(0, 2).map(alert => {
              const alertColor =
                alert.alert_type === 'warranty_expiring' ? colors.warning :
                alert.alert_type === 'maintenance_due' ? colors.info :
                alert.alert_type === 'low_stock' ? colors.error : colors.textSecondary;
              return (
                <View key={alert.id} style={[styles.alertCard, { backgroundColor: colors.surface, borderLeftColor: alertColor }]}>
                  <View style={styles.alertRow}>
                    <View style={styles.alertIcon}>
                      {alert.alert_type === 'warranty_expiring' ? (
                        <Ionicons name="shield-checkmark" size={20} color={alertColor} />
                      ) : alert.alert_type === 'maintenance_due' ? (
                        <Ionicons name="build" size={20} color={alertColor} />
                      ) : alert.alert_type === 'low_stock' ? (
                        <Ionicons name="trending-down" size={20} color={alertColor} />
                      ) : (
                        <Ionicons name="alert-circle" size={20} color={alertColor} />
                      )}
                    </View>
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: colors.textPrimary }]}>{alert.title}</Text>
                      <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{alert.message}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Recently Added */}
        {recentItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT ITEMS</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/inventory')}>
                <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
              </TouchableOpacity>
            </View>
            {recentItems.map((item: Item) => {
              const catColor = (item.category?.color_hex as string) ?? colors.primary;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, { backgroundColor: colors.surface, borderLeftColor: catColor }]}
                  onPress={() => router.push(`/item/${item.id}` as `/${string}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemRowContent}>
                    <View style={[styles.itemEmoji, { backgroundColor: colors.gray200 }]}>
                      {item.category?.icon_emoji ? (
                        <Text>{item.category.icon_emoji}</Text>
                      ) : (
                        <Ionicons name="cube-outline" size={20} color={colors.gray500} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.itemMeta, { color: colors.textTertiary }]}>
                        {item.location ?? 'No location'} · {formatDate(item.created_at)}
                      </Text>
                    </View>
                    {item.purchase_price && (
                      <Text style={[styles.itemPrice, { color: colors.primary }]}>
                        {formatPrice(item.purchase_price, item.currency)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Insights */}
        {items.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ANALYTICS</Text>
            </View>

            <Card variant="elevated" style={styles.chartCard} padding={16}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Value by Category</Text>
              <ValueByCategory items={items} />
            </Card>

            <Card variant="elevated" style={styles.chartCard} padding={16}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Item Conditions</Text>
              <ConditionBreakdown items={items} />
            </Card>

            <Card variant="elevated" style={styles.chartCard} padding={16}>
              <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>This Week</Text>
              <RecentActivity items={items} />
            </Card>
          </>
        )}

        {items.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.gray400} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No items yet</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Start by adding your first item. Use AI to auto-fill details from a photo.
            </Text>
            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/add-item')}
            >
              <Text style={styles.emptyBtnText}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greeting: { fontSize: 13, fontWeight: '500' },
  workspaceName: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  alertBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  tierDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierDotInner: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  body: { padding: 16, paddingTop: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 8,
  },
  seeAll: { fontSize: 13, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickActionIcon: { marginBottom: 4 },
  quickActionLabel: { fontSize: 10, fontWeight: '600' },
  alertCard: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start' },
  alertIcon: { marginRight: 10 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  alertMessage: { fontSize: 12 },
  itemRow: {
    marginBottom: 6,
    padding: 10,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  itemRowContent: { flexDirection: 'row', alignItems: 'center' },
  itemEmoji: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: '600' },
  itemMeta: { fontSize: 11, marginTop: 1 },
  itemPrice: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
  },
  emptyBtnText: { fontWeight: '700', fontSize: 14, color: '#FFFFFF' },
  chartCard: {
    marginBottom: 10,
    borderRadius: 6,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
});
