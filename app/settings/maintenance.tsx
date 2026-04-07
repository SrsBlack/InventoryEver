import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useColors } from '../../hooks/useColors';
import { useMaintenance } from '../../hooks/useMaintenance';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonFullScreen } from '../../components/ui/Skeleton';
import { formatPrice, formatDate } from '../../lib/utils';

type Tab = 'upcoming' | 'history';

export default function MaintenanceScreen() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const colors = useColors();
  const { upcoming, past, loading, refresh } = useMaintenance(activeWorkspace?.id);
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Group upcoming entries by month label (e.g. "April 2026")
  const groupedUpcoming = upcoming.reduce<Record<string, typeof upcoming>>((acc, log) => {
    if (!log.next_scheduled_date) return acc;
    try {
      const date = parseISO(log.next_scheduled_date);
      if (!isValid(date)) return acc;
      const key = format(date, 'MMMM yyyy');
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
    } catch {
      // skip invalid dates
    }
    return acc;
  }, {});

  const monthGroups = Object.entries(groupedUpcoming);

  return (
    <>
      <Stack.Screen options={{ title: 'Maintenance', headerBackTitle: 'Back' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Tab toggle */}
        <View style={[styles.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'upcoming' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'upcoming' ? colors.primary : colors.textSecondary },
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'history' && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === 'history' ? colors.primary : colors.textSecondary },
              ]}
            >
              History
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <SkeletonFullScreen />
        ) : (
          <ScrollView
            style={styles.scroll}
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
            <View style={styles.body}>
              {activeTab === 'upcoming' ? (
                monthGroups.length === 0 ? (
                  <EmptyState
                    icon="calendar-outline"
                    message="No scheduled maintenance. Log a service on any item to track upcoming maintenance."
                    colors={colors}
                  />
                ) : (
                  monthGroups.map(([month, logs]) => (
                    <View key={month} style={styles.monthGroup}>
                      <Text style={[styles.monthLabel, { color: colors.textSecondary }]}>{month}</Text>
                      {logs.map(log => (
                        <UpcomingCard
                          key={log.id}
                          log={log}
                          colors={colors}
                          onPress={() => log.item?.id && router.push(`/item/${log.item.id}` as `/${string}`)}
                        />
                      ))}
                    </View>
                  ))
                )
              ) : (
                past.length === 0 ? (
                  <EmptyState
                    icon="time-outline"
                    message="No maintenance history yet."
                    colors={colors}
                  />
                ) : (
                  past.map(log => (
                    <HistoryCard
                      key={log.id}
                      log={log}
                      colors={colors}
                      onPress={() => log.item?.id && router.push(`/item/${log.item.id}` as `/${string}`)}
                    />
                  ))
                )
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </>
  );
}

function urgencyBadge(nextDate: string, colors: ReturnType<typeof useColors>) {
  try {
    const date = parseISO(nextDate);
    if (!isValid(date)) return null;
    const days = differenceInDays(date, new Date());
    if (days < 3) {
      return { label: days <= 0 ? 'Overdue' : `In ${days}d`, bg: colors.error + '22', color: colors.error };
    }
    if (days <= 7) {
      return { label: `In ${days}d`, bg: colors.warning + '22', color: colors.warning };
    }
    return { label: `In ${days}d`, bg: colors.success + '22', color: colors.success };
  } catch {
    return null;
  }
}

function UpcomingCard({
  log,
  colors,
  onPress,
}: {
  log: { id: string; next_scheduled_date?: string; maintenance_type?: string; description?: string; item?: { id: string; name: string } };
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  const badge = log.next_scheduled_date ? urgencyBadge(log.next_scheduled_date, colors) : null;
  const dayNum = log.next_scheduled_date
    ? (() => {
        try {
          const d = parseISO(log.next_scheduled_date);
          return isValid(d) ? format(d, 'd') : '?';
        } catch {
          return '?';
        }
      })()
    : '?';

  return (
    <Card variant="flat" padding={12} style={styles.card} onPress={onPress}>
      <View style={styles.cardRow}>
        {/* Date badge */}
        <View style={[styles.dateBadge, { backgroundColor: colors.primary + '22' }]}>
          <Text style={[styles.dateBadgeNum, { color: colors.primary }]}>{dayNum}</Text>
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={[styles.cardItemName, { color: colors.textPrimary }]} numberOfLines={1}>
            {log.item?.name ?? 'Unknown Item'}
          </Text>
          <Text style={[styles.cardType, { color: colors.textSecondary }]}>
            {log.maintenance_type ?? 'Service'}
          </Text>
          {log.description ? (
            <Text style={[styles.cardDesc, { color: colors.textTertiary }]} numberOfLines={1}>
              {log.description}
            </Text>
          ) : null}
        </View>

        {/* Urgency badge */}
        {badge && (
          <Badge
            label={badge.label}
            backgroundColor={badge.bg}
            color={badge.color}
            size="sm"
          />
        )}
      </View>
    </Card>
  );
}

function HistoryCard({
  log,
  colors,
  onPress,
}: {
  log: { id: string; performed_at: string; maintenance_type?: string; description?: string; cost?: number; item?: { id: string; name: string } };
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Card variant="flat" padding={12} style={styles.card} onPress={onPress}>
      <View style={styles.cardRow}>
        <View style={[styles.historyIcon, { backgroundColor: colors.gray100 }]}>
          <Ionicons name="build" size={20} color={colors.textSecondary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={[styles.cardItemName, { color: colors.textPrimary }]} numberOfLines={1}>
            {log.item?.name ?? 'Unknown Item'}
          </Text>
          <Text style={[styles.cardType, { color: colors.textSecondary }]}>
            {log.maintenance_type ?? 'Service'}
          </Text>
          <Text style={[styles.cardDate, { color: colors.textTertiary }]}>
            {formatDate(log.performed_at)}
          </Text>
        </View>
        {log.cost ? (
          <Text style={[styles.cardCost, { color: colors.primary }]}>{formatPrice(log.cost)}</Text>
        ) : null}
      </View>
    </Card>
  );
}

function EmptyState({
  icon,
  message,
  colors,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  message: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name={icon} size={56} color={colors.gray300} style={styles.emptyIcon} />
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  tabLabel: { fontSize: 15, fontWeight: '600' },
  scroll: { flex: 1 },
  body: { padding: 16 },
  monthGroup: { marginBottom: 20 },
  monthLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  card: { marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  dateBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateBadgeNum: { fontSize: 16, fontWeight: '800' },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1, marginRight: 8 },
  cardItemName: { fontSize: 14, fontWeight: '700' },
  cardType: { fontSize: 13, marginTop: 1 },
  cardDesc: { fontSize: 12, marginTop: 1 },
  cardDate: { fontSize: 12, marginTop: 1 },
  cardCost: { fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 56 },
  emptyIcon: { marginBottom: 16 },
  emptyMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 24,
  },
});
