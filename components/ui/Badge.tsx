import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface BadgeProps {
  label: string;
  color?: string;
  backgroundColor?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  label,
  color = Colors.white,
  backgroundColor = Colors.primary,
  size = 'md',
  style,
}: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor },
        size === 'sm' && styles.sm,
        style,
      ]}
    >
      <Text style={[styles.text, { color }, size === 'sm' && styles.textSm]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  sm: {
    paddingHorizontal: 7,
    paddingVertical: 2,
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
