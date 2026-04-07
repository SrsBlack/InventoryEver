/**
 * Push notification helpers for InventoryEver.
 *
 * Uses expo-notifications for:
 *  1. Requesting permissions and obtaining the Expo Push Token
 *  2. Saving/removing device tokens in Supabase (device_tokens table)
 *  3. Scheduling local notifications for warranty/maintenance reminders
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications are presented when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// ── Permission & Token ────────────────────────────────────────────────────────

export async function requestPushPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // Simulators can't receive push notifications
    return false;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  try {
    const granted = await requestPushPermission();
    if (!granted) return null;

    // Android needs a notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'InventoryEver',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch {
    return null;
  }
}

// ── Supabase Device Token Registry ───────────────────────────────────────────

export async function registerDeviceToken(userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Platform.OS,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'token' }
  );
}

export async function unregisterDeviceToken(userId: string): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;

  await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('token', token);
}

// ── Local Notifications (no server required) ─────────────────────────────────

export async function scheduleWarrantyReminder(
  itemName: string,
  itemId: string,
  expiryDate: Date,
  daysBeforeExpiry = 7
): Promise<string | null> {
  const triggerDate = new Date(expiryDate);
  triggerDate.setDate(triggerDate.getDate() - daysBeforeExpiry);

  if (triggerDate <= new Date()) return null; // already past

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Warranty Expiring Soon',
      body: `${itemName}'s warranty expires in ${daysBeforeExpiry} days.`,
      data: { type: 'warranty', itemId },
      sound: true,
    },
    trigger: { date: triggerDate },
  });
}

export async function scheduleMaintenanceReminder(
  itemName: string,
  itemId: string,
  scheduledDate: Date
): Promise<string | null> {
  if (scheduledDate <= new Date()) return null;

  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'Maintenance Due',
      body: `Time to service ${itemName}.`,
      data: { type: 'maintenance', itemId },
      sound: true,
    },
    trigger: { date: scheduledDate },
  });
}

export async function cancelNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function getBadgeCount(): Promise<number> {
  return Notifications.getBadgeCountAsync();
}

export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}
