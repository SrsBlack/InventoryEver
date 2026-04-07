import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    sm: { paddingH: 12, paddingV: 8, fontSize: 13 },
    md: { paddingH: 20, paddingV: 13, fontSize: 15 },
    lg: { paddingH: 28, paddingV: 16, fontSize: 17 },
  };

  const sz = sizeStyles[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[{ borderRadius: 12, overflow: 'hidden', alignSelf: fullWidth ? 'stretch' : 'auto' }, style]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: isDisabled }}
      >
        <LinearGradient
          colors={isDisabled ? [colors.gray300, colors.gray300] : colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[{ paddingHorizontal: sz.paddingH, paddingVertical: sz.paddingV, alignItems: 'center', justifyContent: 'center' }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              {icon && <Ionicons name={icon as any} size={sz.fontSize} color={colors.white} style={{ marginRight: 6 }} />}
              <Text style={[{ color: colors.white, fontWeight: '700', letterSpacing: 0.3, fontSize: sz.fontSize }, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantMap: Record<ButtonVariant, ViewStyle> = {
    primary: {},
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
        { borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
        variantMap[variant],
        { paddingHorizontal: sz.paddingH, paddingVertical: sz.paddingV },
        isDisabled && { opacity: 0.5 },
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
