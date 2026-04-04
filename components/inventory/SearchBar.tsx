import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
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
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const debouncedSearch = useRef(
    debounce((q: string) => onSearch(q), Config.searchDebounceMs)
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
    outputRange: [Colors.border, Colors.primary],
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
      <Animated.View style={[styles.container, { borderColor }]}>
        <Ionicons name="search" size={18} color={Colors.gray400} style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray400}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          clearButtonMode="never"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={Colors.gray400} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {onFilterPress && (
        <TouchableOpacity
          onPress={onFilterPress}
          style={[styles.filterBtn, hasActiveFilters && styles.filterBtnActive]}
        >
          <Ionicons
            name="options"
            size={18}
            color={hasActiveFilters ? Colors.primary : Colors.textSecondary}
          />
          {hasActiveFilters && <View style={styles.filterDot} />}
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
    backgroundColor: Colors.surface,
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
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  filterBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '11',
  },
  filterDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.error,
  },
});
