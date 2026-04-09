import React from 'react';
import { View, ViewStyle, TouchableOpacity } from 'react-native';
import { useColors } from '../../hooks/useColors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'flat' | 'bordered';
  padding?: number;
}

export function Card({ children, style, onPress, variant = 'default', padding = 16 }: CardProps) {
  const colors = useColors();

  const variantStyles: Record<string, ViewStyle> = {
    default: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    elevated: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.borderFocus + '40',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 4,
    },
    flat: {
      backgroundColor: colors.gray100,
      borderRadius: 4,
    },
    bordered: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
  };

  const containerStyle = [{ overflow: 'hidden' as const }, variantStyles[variant], { padding }, style];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={containerStyle} activeOpacity={0.85}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}
