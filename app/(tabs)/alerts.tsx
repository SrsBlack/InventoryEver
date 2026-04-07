import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useAlerts } from '../../hooks/useAlerts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonAlertList } from '../../components/ui/Skeleton';
import { useColors } from '../../hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDate } from '../../lib/utils';
import type { Alert as AlertType } from '../../types';

function getAlertIcon(alertType: string, color: string) {
  switch (alertType) {
    case 'warranty_expiring':
      return <Ionicons name="shield-checkmark" size={18} color={color} />;
    case 'maintenance_due':
      return <Ionicons name="build" size={18} color={color} />;
    case 'low_stock':
      return <Ionicons name="trending-down" size={18} color={color} />;
    default:
      return <Ionicons name="alert-circle" size={18} color={color} />;
  }
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { alerts, unreadCount, loading, fetchAlerts, markRead, resolveAlert, markAllRead } =
    useAlerts(activeWorkspace?.id);
  const [refreshing, setRefreshing] = React.useState(false);

  const ALERT_COLORS: Record<string, string> = {
    warranty_expiring: colors.warning,
    maintenance_due: colors.info,
    low_stock: colors.error,
    custom: colors.textSecondary,
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAlerts(),
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
    setRefreshing(false);
  };

  const renderAlert = ({ item }: { item: AlertType }) => {
    const color = ALERT_COLORS[item.alert_type] ?? colors.textSecondary;

    return (
      <TouchableOpacity
        style={[
          styles.alertCard,
          { backgroundColor: colors.surface, borderLeftColor: color },
          !item.is_read && { backgroundColor: colors.gray200 },
        ]}
        onPress={() => {
          markRead(item.id);
          if (item.item_id) {
            router.push(`/item/${item.item_id}` as `/${string}`);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.alertRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.gray200 }]}>
            {getAlertIcon(item.alert_type, color)}
          </View>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, { color: colors.textPrimary }, !item.is_read && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={[styles.alertMessage, { color: colors.textSecondary }]}>{item.message}</Text>
            <Text style={[styles.alertTime, { color: colors.textTertiary }]}>{formatDate(item.triggered_at)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => resolveAlert(item.id)}
            style={[styles.resolveBtn, { backgroundColor: colors.successLight }]}
          >
            <Ionicons name="checkmark" size={14} color={colors.success} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>ALERTS</Text>
          {unreadCount > 0 && (
            <Text style={[styles.headerSubtitle, { color: colors.primary }]}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Button
            title="Mark all read"
            onPress={markAllRead}
            variant="ghost"
            size="sm"
          />
        )}
      </View>

      {loading && alerts.length === 0 ? (
        <SkeletonAlertList />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="shield-checkmark-outline" size={48} color={colors.success} />}
          title="All clear"
          description="No active alerts right now. Here's what we track for you:"
          bullets={[
            'Warranty expiry reminders (30, 7, and 1 day before)',
            'Scheduled maintenance & service intervals',
            'Low stock thresholds for tracked quantities',
            'Custom alerts you set on any item',
          ]}
        />
      ) : (
        <FlatList
          data={alerts}
          renderItem={renderAlert}
          keyExtractor={a => a.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  list: { padding: 12 },
  alertCard: {
    marginBottom: 6,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  alertContent: { flex: 1 },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  unreadTitle: { fontWeight: '800' },
  alertMessage: { fontSize: 12, lineHeight: 17 },
  alertTime: { fontSize: 10, marginTop: 3 },
  resolveBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
