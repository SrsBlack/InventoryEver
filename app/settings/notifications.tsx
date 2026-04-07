import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { useColors } from '../../hooks/useColors';
import { requestPushPermission, registerDeviceToken, unregisterDeviceToken } from '../../lib/notifications';
import { useAuthContext } from '../../contexts/AuthContext';

const STORAGE_KEY = 'notification_prefs';

interface NotificationPrefs {
  warrantyExpiring: boolean;
  maintenanceDue: boolean;
  lowStock: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  sound: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  warrantyExpiring: true,
  maintenanceDue: true,
  lowStock: true,
  pushNotifications: true,
  emailNotifications: false,
  sound: true,
};

export default function NotificationsScreen() {
  const { user } = useAuthContext();
  const colors = useColors();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        } catch {
          // ignore malformed data
        }
      }
    });
  }, []);

  const toggle = async (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // When toggling push notifications, request permission and register/deregister token
    if (key === 'pushNotifications' && user?.id) {
      if (updated.pushNotifications) {
        const granted = await requestPushPermission();
        if (!granted) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to receive push alerts.',
            [{ text: 'OK' }]
          );
          // Revert toggle
          const reverted = { ...updated, pushNotifications: false };
          setPrefs(reverted);
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reverted));
          return;
        }
        await registerDeviceToken(user.id);
      } else {
        await unregisterDeviceToken(user.id);
      }
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Alerts */}
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Alerts</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <ToggleRow
              label="Warranty expiring"
              value={prefs.warrantyExpiring}
              onToggle={() => toggle('warrantyExpiring')}
              isLast={false}
            />
            <ToggleRow
              label="Maintenance due"
              value={prefs.maintenanceDue}
              onToggle={() => toggle('maintenanceDue')}
              isLast={false}
            />
            <ToggleRow
              label="Low stock"
              value={prefs.lowStock}
              onToggle={() => toggle('lowStock')}
              isLast
            />
          </Card>

          {/* General */}
          <View style={styles.sectionHeader}>
            <Ionicons name="settings-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>General</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <ToggleRow
              label="Push notifications"
              value={prefs.pushNotifications}
              onToggle={() => toggle('pushNotifications')}
              isLast={false}
            />
            <ComingSoonRow label="Email notifications" isLast={false} />
            <ToggleRow
              label="Sound"
              value={prefs.sound}
              onToggle={() => toggle('sound')}
              isLast
            />
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  isLast,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray200, true: colors.primary + '66' }}
        thumbColor={value ? colors.primary : colors.gray400}
      />
    </View>
  );
}

function ComingSoonRow({ label, isLast }: { label: string; isLast: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>Coming soon</Text>
      </View>
      <Switch
        value={false}
        disabled
        trackColor={{ false: colors.gray200, true: colors.gray200 }}
        thumbColor={colors.gray400}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionIcon: { marginRight: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
});
