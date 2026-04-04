import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'flat' | 'bordered';
  padding?: number;
}

export function Card({ children, style, onPress, variant = 'default', padding = 16 }: CardProps) {
  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: Colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.border,
    },
    elevated: {
      backgroundColor: Colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.borderFocus + '40',
      shadowColor: Colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    flat: {
      backgroundColor: Colors.gray200,
      borderRadius: 8,
    },
    bordered: {
      backgroundColor: Colors.surface,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.border,
    },
  };

  const containerStyle = [styles.base, variantStyles[variant], { padding }, style];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={containerStyle} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
