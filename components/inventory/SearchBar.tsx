import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { debounce } from '../../lib/utils';
import { Config } from '../../constants/config';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
  hasActiveFilters?: boolean;
}

export function SearchBar({
  onSearch,
  placeholder = 'Search inventory...',
  onFilterPress,
  hasActiveFilters = false,
}: SearchBarProps) {
  const colors = useColors();
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const debouncedSearch = useRef(
    debounce(onSearch, Config.searchDebounceMs)
  ).current;

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused, borderAnim]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const handleChange = (text: string) => {
    setValue(text);
    debouncedSearch(text);
  };

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <View style={styles.wrapper}>
      <Animated.View
        style={[
          styles.container,
          { borderColor, backgroundColor: colors.surface },
        ]}
      >
        <Ionicons name="search" size={18} color={colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: colors.textPrimary }]}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.gray400}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          clearButtonMode="never"
          accessibilityLabel="Search inventory"
          accessibilityRole="search"
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={[
            styles.filterBtn,
            {
              backgroundColor: hasActiveFilters ? colors.primary + '11' : colors.surface,
              borderColor: hasActiveFilters ? colors.primary : colors.border,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={hasActiveFilters ? 'Filters (active)' : 'Filters'}
          accessibilityHint="Open filter options"
        >
          <Ionicons
            name="options"
            size={18}
            color={hasActiveFilters ? colors.primary : colors.textSecondary}
          />
          {hasActiveFilters && (
            <View style={[styles.filterDot, { backgroundColor: colors.error }]} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1.5,
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
