import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useColors } from '../../hooks/useColors';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  label,
  color,
  backgroundColor,
  size = 'md',
  style,
}: BadgeProps) {
  const colors = useColors();
  const bgColor = backgroundColor ?? colors.primary;
  const textColor = color ?? colors.white;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bgColor },
        size === 'sm' && styles.sm,
        style,
      ]}
    >
      <Text style={[styles.text, { color: textColor }, size === 'sm' && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  textSm: {
    fontSize: 10,
  },
});
