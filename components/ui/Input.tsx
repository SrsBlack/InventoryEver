import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  required,
  ...props
}: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          { borderColor: colors.border, backgroundColor: colors.gray100 },
          focused && { borderColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
          !!error && { borderColor: colors.error },
        ]}
      >
        {icon && <Ionicons name={icon as any} size={18} color={focused ? colors.primary : colors.gray400} />}
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary },
            icon && styles.inputWithIcon,
            rightIcon && styles.inputWithRightIcon,
          ]}
          placeholderTextColor={colors.gray400}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label ?? props.placeholder}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIconBtn}
            accessibilityRole="button"
            accessibilityLabel={rightIcon}
          >
            <Ionicons name={rightIcon as any} size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.hint, { color: colors.error }]}>{error}</Text>}
      {hint && !error && <Text style={[styles.hint, { color: colors.textTertiary }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  rightIconBtn: {
    padding: 4,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
