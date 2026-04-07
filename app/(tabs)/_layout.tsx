import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthContext } from '../../contexts/AuthContext';
import { WorkspaceProvider } from '../../contexts/WorkspaceContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { SubscriptionProvider } from '../../contexts/SubscriptionContext';
import { TabIcons } from '../../constants/icons';
import { useColors } from '../../hooks/useColors';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ConnectionStatus } from '../../components/ui/ConnectionStatus';
import type { IconName } from '../../constants/icons';

/** Mounts inside WorkspaceProvider so it can access activeWorkspace */
function SyncManager() {
  const { activeWorkspace } = useWorkspaceContext();
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync({
    workspaceId: activeWorkspace?.id,
  });
  return (
    <ConnectionStatus
      isOnline={isOnline}
      pendingCount={pendingCount}
      isSyncing={isSyncing}
      onSyncPress={triggerSync}
    />
  );
}

function TabIcon({ icon, iconOutline, label, focused }: { icon: IconName; iconOutline: IconName; label: string; focused: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.tabIcon}>
      <Ionicons
        name={focused ? icon : iconOutline}
        size={22}
        color={focused ? colors.primary : colors.gray500}
      />
      <Text style={[
        styles.tabLabel,
        { color: focused ? colors.primary : colors.gray500 },
        focused && styles.tabLabelActive,
      ]}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function AddButton({ focused }: { focused: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </View>
  );
}

export default function TabsLayout() {
  const { user } = useAuthContext();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Register push notifications at the app shell level
  usePushNotifications({ userId: user?.id });

  const tabBarHeight = 60 + insets.bottom;

  return (
    <WorkspaceProvider userId={user?.id}>
      <SubscriptionProvider userId={user?.id}>
        <SyncManager />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: [
              styles.tabBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
                height: tabBarHeight,
                paddingBottom: insets.bottom + 4,
              },
            ],
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray500,
            tabBarShowLabel: false,
          }}
          screenListeners={{
            tabPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon={TabIcons.home} iconOutline={TabIcons.homeOutline} label="Home" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="inventory"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon={TabIcons.inventory} iconOutline={TabIcons.inventoryOutline} label="Items" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="add-item"
            options={{
              tabBarIcon: ({ focused }) => <AddButton focused={focused} />,
            }}
          />
          <Tabs.Screen
            name="alerts"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon={TabIcons.alerts} iconOutline={TabIcons.alertsOutline} label="Alerts" focused={focused} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              tabBarIcon: ({ focused }) => (
                <TabIcon icon={TabIcons.profile} iconOutline={TabIcons.profileOutline} label="Profile" focused={focused} />
              ),
            }}
          />
        </Tabs>
      </SubscriptionProvider>
    </WorkspaceProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    paddingTop: 6,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.8,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
