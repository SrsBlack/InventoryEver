import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const sizeStyles: Record<ButtonSize, { paddingH: number; paddingV: number; fontSize: number }> = {
    sm: { paddingH: 12, paddingV: 7, fontSize: 13 },
    md: { paddingH: 16, paddingV: 9, fontSize: 15 },
    lg: { paddingH: 20, paddingV: 11, fontSize: 17 },
  };

  const sz = sizeStyles[size];

  const variantMap: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.primaryLight + '22', borderColor: colors.primary, borderWidth: 1.5 },
    outline: { backgroundColor: 'transparent', borderColor: colors.primary, borderWidth: 1.5 },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: colors.error },
    success: { backgroundColor: colors.success },
  };

  const textColorMap: Record<ButtonVariant, string> = {
    primary: colors.white,
    secondary: colors.primary,
    outline: colors.primary,
    ghost: colors.primary,
    danger: colors.white,
    success: colors.white,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={[
        { borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
        variantMap[variant],
        { paddingHorizontal: sz.paddingH, paddingVertical: sz.paddingV },
        isDisabled && { opacity: 0.4 },
        fullWidth && { alignSelf: 'stretch' },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColorMap[variant]} size="small" />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {icon && <Ionicons name={icon as any} size={sz.fontSize} color={textColorMap[variant]} style={{ marginRight: 6 }} />}
          <Text style={[{ fontWeight: '600', letterSpacing: 0.3 }, { color: textColorMap[variant], fontSize: sz.fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
