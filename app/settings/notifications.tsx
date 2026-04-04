import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Colors } from '../../constants/colors';

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

  const toggle = (key: keyof NotificationPrefs) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* Alerts */}
          <View style={styles.sectionHeader}>
            <Ionicons name="alert-circle-outline" size={18} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Alerts</Text>
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
            <Ionicons name="settings-outline" size={18} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>General</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <ToggleRow
              label="Push notifications"
              value={prefs.pushNotifications}
              onToggle={() => toggle('pushNotifications')}
              isLast={false}
            />
            <ToggleRow
              label="Email notifications"
              value={prefs.emailNotifications}
              onToggle={() => toggle('emailNotifications')}
              isLast={false}
            />
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
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.gray200, true: Colors.primary + '66' }}
        thumbColor={value ? Colors.primary : Colors.gray400}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
    color: Colors.textPrimary,
  },
  card: { marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
});
