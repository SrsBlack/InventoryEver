/**
 * usePushNotifications — registers device token on sign-in,
 * listens for incoming notification taps, and navigates to the relevant screen.
 */

import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { registerDeviceToken, clearBadge } from '../lib/notifications';

interface UsePushNotificationsOptions {
  userId: string | undefined;
}

export function usePushNotifications({ userId }: UsePushNotificationsOptions) {
  const router = useRouter();
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);
  const receivedListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Register device token when user is authenticated
    registerDeviceToken(userId);

    // Clear badge when app opens
    clearBadge();

    // Handle notification received while app is foregrounded
    receivedListenerRef.current = Notifications.addNotificationReceivedListener(() => {
      // Badge is managed server-side; nothing extra needed here
    });

    // Handle tap on notification (app in background or killed)
    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as {
        type?: string;
        itemId?: string;
        lendingId?: string;
      };

      if (data.type === 'warranty' && data.itemId) {
        router.push(`/item/${data.itemId}`);
      } else if (data.type === 'maintenance' && data.itemId) {
        router.push(`/item/${data.itemId}`);
      } else if (data.type === 'lending' && data.lendingId) {
        router.push(`/lending/${data.lendingId}`);
      } else {
        router.push('/(tabs)/alerts');
      }
    });

    return () => {
      receivedListenerRef.current?.remove();
      responseListenerRef.current?.remove();
    };
  }, [userId, router]);
}
