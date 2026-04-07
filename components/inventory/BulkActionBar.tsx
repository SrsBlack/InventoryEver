import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface BulkActionBarProps {
  selectedCount: number;
  onDelete: () => void;
  onExport: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onDelete,
  onExport,
  onClearSelection,
}: BulkActionBarProps) {
  const colors = useColors();
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: selectedCount > 0 ? 0 : 80,
      useNativeDriver: true,
      tension: 120,
      friction: 10,
    }).start();
  }, [selectedCount, translateY]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Items',
      `Are you sure you want to delete ${selectedCount} item${selectedCount !== 1 ? 's' : ''}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.gray800, transform: [{ translateY }] },
      ]}
    >
      <View style={styles.inner}>
        <View style={styles.leftSection}>
          <Text style={[styles.countText, { color: colors.white }]}>
            {selectedCount} selected
          </Text>
          <TouchableOpacity
            onPress={onClearSelection}
            style={[styles.clearButton, { borderColor: colors.gray600 }]}
          >
            <Text style={[styles.clearText, { color: colors.gray300 }]}>Clear</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={handleDelete} style={styles.actionButton}>
            <Ionicons name="trash" size={22} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onExport} style={styles.actionButton}>
            <Ionicons name="download-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  inner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  countText: {
    fontSize: 15,
    fontWeight: '600',
  },
  clearButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
});
