/**
 * ConnectionStatus — small banner shown when offline or syncing.
 * Renders nothing when fully online with no pending ops.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface Props {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onSyncPress?: () => void;
}

export function ConnectionStatus({ isOnline, pendingCount, isSyncing, onSyncPress }: Props) {
  const colors = useColors();

  // Nothing to show when fully online and queue is empty
  if (isOnline && pendingCount === 0 && !isSyncing) return null;

  const isSyncingOnline = isOnline && (pendingCount > 0 || isSyncing);

  return (
    <View style={[
      styles.banner,
      isSyncingOnline
        ? { backgroundColor: colors.warningLight, borderBottomColor: colors.warning }
        : { backgroundColor: colors.gray200, borderBottomColor: colors.border },
    ]}>
      <View style={styles.left}>
        {isSyncing ? (
          <ActivityIndicator size="small" color={colors.warning} style={styles.icon} />
        ) : (
          <Ionicons
            name={isOnline ? 'cloud-upload-outline' : 'cloud-offline-outline'}
            size={14}
            color={isOnline ? colors.warning : colors.textTertiary}
            style={styles.icon}
          />
        )}
        <Text style={[styles.text, { color: isOnline ? colors.warning : colors.textTertiary }]}>
          {isSyncing
            ? 'Syncing…'
            : isOnline && pendingCount > 0
              ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} pending sync`
              : 'Offline — changes will sync when reconnected'}
        </Text>
      </View>

      {isOnline && pendingCount > 0 && !isSyncing && onSyncPress && (
        <TouchableOpacity onPress={onSyncPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.syncNow, { color: colors.warning }]}>Sync now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  icon: { marginRight: 8 },
  text: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  syncNow: {
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
