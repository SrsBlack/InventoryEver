import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

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
      >
        <LinearGradient
          colors={isDisabled ? [Colors.gray300, Colors.gray300] : Colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, { paddingHorizontal: sz.paddingH, paddingVertical: sz.paddingV }]}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <View style={styles.btnContent}>
              {icon && <Ionicons name={icon as any} size={sz.fontSize} color={Colors.white} style={styles.btnIcon} />}
              <Text style={[styles.primaryText, { fontSize: sz.fontSize }, textStyle]}>{title}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantMap: Record<ButtonVariant, ViewStyle> = {
    primary: {},
    secondary: { backgroundColor: Colors.primaryLight + '22', borderColor: Colors.primary, borderWidth: 1.5 },
    outline: { backgroundColor: 'transparent', borderColor: Colors.primary, borderWidth: 1.5 },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: Colors.error },
    success: { backgroundColor: Colors.success },
  };

  const textColorMap: Record<ButtonVariant, string> = {
    primary: Colors.white,
    secondary: Colors.primary,
    outline: Colors.primary,
    ghost: Colors.primary,
    danger: Colors.white,
    success: Colors.white,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[
        styles.base,
        variantMap[variant],
        { paddingHorizontal: sz.paddingH, paddingVertical: sz.paddingV },
        isDisabled && styles.disabled,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColorMap[variant]} size="small" />
      ) : (
        <View style={styles.btnContent}>
          {icon && <Ionicons name={icon as any} size={sz.fontSize} color={textColorMap[variant]} style={styles.btnIcon} />}
          <Text style={[styles.text, { color: textColorMap[variant], fontSize: sz.fontSize }, textStyle]}>
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnIcon: {
    marginRight: 6,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  primaryText: {
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
});
