import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useSubscriptionContext } from '../../contexts/SubscriptionContext';
import { useItems } from '../../hooks/useItems';
import { useAlerts } from '../../hooks/useAlerts';
import { useColors } from '../../hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonDashboard } from '../../components/ui/Skeleton';
import { formatPrice, formatDate, warrantyStatus } from '../../lib/utils';
import { loadSampleData } from '../../lib/sampleData';
import { ValueByCategory } from '../../components/dashboard/ValueByCategory';
import { ConditionBreakdown } from '../../components/dashboard/ConditionBreakdown';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import type { Item } from '../../types';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthContext();
  const { activeWorkspace } = useWorkspaceContext();
  const { tier } = useSubscriptionContext();
  const { items, loading, fetchItems } = useItems(activeWorkspace?.id);
  const { alerts, unreadCount, fetchAlerts } = useAlerts(activeWorkspace?.id);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
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

  const handleLoadSampleData = async () => {
    if (!activeWorkspace?.id) return;
    setLoadingSample(true);
    const { count, error } = await loadSampleData(activeWorkspace.id);
    setLoadingSample(false);
    if (error) {
      Alert.alert('Error', `Could not load sample data: ${error}`);
    } else {
      await fetchItems(true);
      Alert.alert('Sample Data Loaded', `Added ${count} demo items. Explore the app, then clear them from Settings → Export.`);
    }
  };

  const totalValue = items.reduce((sum, item) => sum + (item.purchase_price ?? 0) * item.quantity, 0);
  const warrantyWarnings = items.filter(i => {
    const d = warrantyStatus(i.warranty_expiry_date);
    return d.label !== 'No warranty' && d.label !== 'Valid' && d.label !== 'Expired';
  });
  const itemsNeedingAttention = warrantyWarnings.length + unreadCount;

  const recentItems = items.slice(0, 5);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading && items.length === 0) return <SkeletonDashboard />;

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
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 8 }]}>
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
          <View style={[styles.statCard, { backgroundColor: colors.gray100, borderLeftColor: colors.primary }]}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]}>{items.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>ITEMS</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.gray100, borderLeftColor: colors.accent }]}>
            <Text style={[styles.statNum, { color: colors.textPrimary }]} numberOfLines={1}>{formatPrice(totalValue)}</Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>ASSET VALUE</Text>
          </View>
          <View style={[
            styles.statCard,
            { backgroundColor: colors.gray100, borderLeftColor: itemsNeedingAttention > 0 ? colors.error : colors.success },
          ]}>
            <Text style={[styles.statNum, { color: itemsNeedingAttention > 0 ? colors.error : colors.success }]}>
              {itemsNeedingAttention}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textTertiary }]}>NEED ATTENTION</Text>
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

            <TouchableOpacity
              style={[styles.analyticsBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push('/analytics')}
              activeOpacity={0.8}
            >
              <Ionicons name="bar-chart" size={16} color={colors.primary} />
              <Text style={[styles.analyticsBtnText, { color: colors.primary }]}>View Full Analytics</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </>
        )}

        {items.length === 0 && !loading && (
          <View style={[styles.emptyContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="cube-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Your inventory awaits</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              Track everything you own — at home, in the office, or across your business.
            </Text>

            {/* Feature highlights */}
            <View style={[styles.emptyFeatures, { borderColor: colors.border }]}>
              {[
                { icon: 'camera', text: 'AI fills in details from a photo or barcode' },
                { icon: 'shield-checkmark', text: 'Warranty & maintenance alerts' },
                { icon: 'location', text: 'Organize by rooms, areas, and spots' },
                { icon: 'people', text: 'Share with your team or family' },
              ].map(f => (
                <View key={f.icon} style={styles.emptyFeatureRow}>
                  <Ionicons name={f.icon as any} size={16} color={colors.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.emptyFeatureText, { color: colors.textSecondary }]}>{f.text}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/add-item')}
              accessibilityRole="button"
            >
              <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyBtnText}>Add Your First Item</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.emptyBtnSecondary, { borderColor: colors.border }]}
              onPress={handleLoadSampleData}
              disabled={loadingSample}
              accessibilityRole="button"
            >
              <Ionicons name="flask-outline" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[styles.emptyBtnSecondaryText, { color: colors.textSecondary }]}>
                {loadingSample ? 'Loading…' : 'Explore with sample data'}
              </Text>
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
    paddingTop: 0,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  emptyFeatures: {
    width: '100%',
    borderTopWidth: 1,
    paddingTop: 16,
    marginBottom: 20,
    gap: 10,
  },
  emptyFeatureRow: { flexDirection: 'row', alignItems: 'center' },
  emptyFeatureText: { fontSize: 13, lineHeight: 20, flex: 1 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 10,
    width: '100%',
    marginBottom: 10,
  },
  emptyBtnText: { fontWeight: '700', fontSize: 15, color: '#FFFFFF' },
  emptyBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    width: '100%',
  },
  emptyBtnSecondaryText: { fontWeight: '600', fontSize: 14 },
  chartCard: {
    marginBottom: 10,
    borderRadius: 6,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  analyticsBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
});
