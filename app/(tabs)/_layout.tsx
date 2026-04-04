import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { WorkspaceProvider } from '../../contexts/WorkspaceContext';
import { SubscriptionProvider } from '../../contexts/SubscriptionContext';
import { TabIcons } from '../../constants/icons';
import { useColors } from '../../hooks/useColors';
import type { IconName } from '../../constants/icons';

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

export default function TabsLayout() {
  const { user } = useAuthContext();
  const colors = useColors();

  return (
    <WorkspaceProvider userId={user?.id}>
      <SubscriptionProvider userId={user?.id}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: [styles.tabBar, { backgroundColor: colors.background, borderTopColor: colors.border }],
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.gray500,
            tabBarShowLabel: false,
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
              tabBarIcon: ({ focused }) => (
                <View style={[styles.addBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
              ),
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
    height: 60,
    paddingBottom: 6,
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
