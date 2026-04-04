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
import { Spinner } from '../../components/ui/Spinner';
import { Colors } from '../../constants/colors';
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

const ALERT_COLORS: Record<string, string> = {
  warranty_expiring: Colors.warning,
  maintenance_due: Colors.info,
  low_stock: Colors.error,
  custom: Colors.textSecondary,
};

export default function AlertsScreen() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { alerts, unreadCount, loading, fetchAlerts, markRead, resolveAlert, markAllRead } =
    useAlerts(activeWorkspace?.id);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAlerts(),
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
    setRefreshing(false);
  };

  const renderAlert = ({ item }: { item: AlertType }) => {
    const color = ALERT_COLORS[item.alert_type] ?? Colors.textSecondary;

    return (
      <TouchableOpacity
        style={[styles.alertCard, { borderLeftColor: color }, !item.is_read && styles.unreadCard]}
        onPress={() => {
          markRead(item.id);
          if (item.item_id) {
            router.push(`/item/${item.item_id}` as `/${string}`);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.alertRow}>
          <View style={styles.iconWrap}>
            {getAlertIcon(item.alert_type, color)}
          </View>
          <View style={styles.alertContent}>
            <Text style={[styles.alertTitle, !item.is_read && styles.unreadTitle]}>
              {item.title}
            </Text>
            <Text style={styles.alertMessage}>{item.message}</Text>
            <Text style={styles.alertTime}>{formatDate(item.triggered_at)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => resolveAlert(item.id)}
            style={styles.resolveBtn}
          >
            <Ionicons name="checkmark" size={14} color={Colors.success} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>ALERTS</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
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
        <Spinner fullScreen />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={<Ionicons name="notifications-outline" size={64} color={Colors.gray400} />}
          title="All clear"
          description="No active alerts. We'll notify you when items need attention."
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
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  list: { padding: 12 },
  alertCard: {
    marginBottom: 6,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderLeftWidth: 3,
  },
  unreadCard: {
    backgroundColor: Colors.gray200,
  },
  alertRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  alertContent: { flex: 1 },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  unreadTitle: { fontWeight: '800' },
  alertMessage: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  alertTime: { fontSize: 10, color: Colors.textTertiary, marginTop: 3 },
  resolveBtn: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
