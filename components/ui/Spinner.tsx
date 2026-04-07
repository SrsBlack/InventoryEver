import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  label?: string;
  fullScreen?: boolean;
}

export function Spinner({ size = 'large', color, label, fullScreen }: SpinnerProps) {
  const colors = useColors();
  const spinnerColor = color ?? colors.primary;

  return (
    <View style={[styles.container, fullScreen && { flex: 1, backgroundColor: colors.background }]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
