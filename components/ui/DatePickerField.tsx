import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  TextInput,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function buildYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 10; y >= 1970; y--) {
    years.push(y);
  }
  return years;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

function parseDateString(value: string | undefined): { year: number; month: number; day: number } | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { year: y, month: m, day: d };
}

function formatDisplayDate(value: string | undefined): string | null {
  const parsed = parseDateString(value);
  if (!parsed) return null;
  const { year, month, day } = parsed;
  if (month < 1 || month > 12) return null;
  return `${SHORT_MONTHS[month - 1]} ${day}, ${year}`;
}

function toDateString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Column Picker — a vertical list of selectable items
// ---------------------------------------------------------------------------

interface ColumnPickerProps {
  data: (string | number)[];
  selectedValue: string | number;
  onSelect: (val: string | number) => void;
  width: number;
}

function ColumnPicker({ data, selectedValue, onSelect, width }: ColumnPickerProps) {
  const colors = useColors();
  const ITEM_HEIGHT = 44;

  const renderItem = ({ item }: { item: string | number }) => {
    const isSelected = item === selectedValue;
    return (
      <TouchableOpacity
        style={[
          colStyles.item,
          { height: ITEM_HEIGHT },
          isSelected && { backgroundColor: colors.primary + '20' },
        ]}
        onPress={() => onSelect(item)}
        activeOpacity={0.7}
      >
        <Text
          style={[
            colStyles.itemText,
            { color: isSelected ? colors.primary : colors.textPrimary },
            isSelected && colStyles.itemTextSelected,
          ]}
          numberOfLines={1}
        >
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

  const initialIndex = data.findIndex(d => d === selectedValue);

  return (
    <FlatList
      data={data}
      keyExtractor={item => String(item)}
      renderItem={renderItem}
      style={{ width }}
      showsVerticalScrollIndicator={false}
      initialScrollIndex={initialIndex >= 0 ? initialIndex : 0}
      getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
    />
  );
}

const colStyles = StyleSheet.create({
  item: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  itemText: {
    fontSize: 15,
    textAlign: 'center',
  },
  itemTextSelected: {
    fontWeight: '700',
  },
});

// ---------------------------------------------------------------------------
// DatePickerField — main component
// ---------------------------------------------------------------------------

export interface DatePickerFieldProps {
  label: string;
  value: string | undefined;
  onChange: (date: string) => void;
  placeholder?: string;
  required?: boolean;
  containerStyle?: ViewStyle;
}

export function DatePickerField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  required,
  containerStyle,
}: DatePickerFieldProps) {
  const colors = useColors();
  const [showPicker, setShowPicker] = useState(false);

  // Derive initial picker state from current value or today
  const getInitialState = useCallback(() => {
    const parsed = parseDateString(value);
    if (parsed) return parsed;
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }, [value]);

  const [pickerYear, setPickerYear] = useState(() => getInitialState().year);
  const [pickerMonth, setPickerMonth] = useState(() => getInitialState().month);
  const [pickerDay, setPickerDay] = useState(() => getInitialState().day);

  const openPicker = () => {
    const init = getInitialState();
    setPickerYear(init.year);
    setPickerMonth(init.month);
    setPickerDay(init.day);
    setShowPicker(true);
  };

  const handleConfirm = () => {
    // Clamp day to valid range for the chosen month/year
    const maxDay = daysInMonth(pickerMonth, pickerYear);
    const safeDay = Math.min(pickerDay, maxDay);
    onChange(toDateString(pickerYear, pickerMonth, safeDay));
    setShowPicker(false);
  };

  const handleClear = () => {
    onChange('');
    setShowPicker(false);
  };

  const displayText = formatDisplayDate(value);
  const hasValue = !!displayText;

  const years = buildYears();
  const monthNames = MONTHS;
  const days = Array.from({ length: daysInMonth(pickerMonth, pickerYear) }, (_, i) => i + 1);

  // Web: render a plain TextInput accepting YYYY-MM-DD
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
        <View
          style={[
            styles.inputWrapper,
            { borderColor: colors.border, backgroundColor: colors.gray100 },
          ]}
        >
          <Ionicons name="calendar-outline" size={18} color={colors.gray400} />
          <TextInput
            style={[styles.input, styles.inputWithIcon, { color: colors.textPrimary }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.gray400}
            value={value ?? ''}
            onChangeText={onChange}
            maxLength={10}
            accessibilityLabel={label}
          />
        </View>
      </View>
    );
  }

  // Native (iOS + Android): TouchableOpacity trigger + Modal picker
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      <TouchableOpacity
        style={[
          styles.inputWrapper,
          { borderColor: colors.border, backgroundColor: colors.gray100 },
        ]}
        onPress={openPicker}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${hasValue ? displayText : placeholder}`}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.gray400} />
        <Text
          style={[
            styles.input,
            styles.inputWithIcon,
            { color: hasValue ? colors.textPrimary : colors.gray400 },
          ]}
          numberOfLines={1}
        >
          {hasValue ? displayText : placeholder}
        </Text>
        {hasValue && (
          <TouchableOpacity
            onPress={() => onChange('')}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Clear date"
          >
            <Ionicons name="close-circle" size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Sheet header */}
          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={handleClear} style={styles.sheetAction}>
              <Text style={[styles.sheetActionText, { color: colors.textSecondary }]}>Clear</Text>
            </TouchableOpacity>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{label}</Text>
            <TouchableOpacity onPress={handleConfirm} style={styles.sheetAction}>
              <Text style={[styles.sheetActionText, { color: colors.primary, fontWeight: '700' }]}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Column pickers */}
          <View style={styles.pickerRow}>
            {/* Month */}
            <ColumnPicker
              data={monthNames}
              selectedValue={MONTHS[pickerMonth - 1]}
              onSelect={val => {
                const idx = MONTHS.indexOf(val as string);
                if (idx >= 0) setPickerMonth(idx + 1);
              }}
              width={130}
            />

            {/* Day */}
            <ColumnPicker
              data={days}
              selectedValue={pickerDay}
              onSelect={val => setPickerDay(val as number)}
              width={60}
            />

            {/* Year */}
            <ColumnPicker
              data={years}
              selectedValue={pickerYear}
              onSelect={val => setPickerYear(val as number)}
              width={80}
            />
          </View>
        </View>
      </Modal>
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
    minHeight: 44,
  },
  input: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderTopWidth: 1,
    paddingBottom: 32,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetAction: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  sheetActionText: {
    fontSize: 15,
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingTop: 8,
    height: 220,
  },
});
