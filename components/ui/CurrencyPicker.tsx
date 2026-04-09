import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { SUPPORTED_CURRENCIES } from '../../lib/depreciation';

interface CurrencyPickerProps {
  value: string;
  onChange: (currency: string) => void;
  label?: string;
}

export function CurrencyPicker({ value, onChange, label = 'Currency' }: CurrencyPickerProps) {
  const colors = useColors();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = SUPPORTED_CURRENCIES.find(c => c.code === value) ?? SUPPORTED_CURRENCIES[0];

  const filtered = SUPPORTED_CURRENCIES.filter(c =>
    search === '' ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerSymbol, { color: colors.textPrimary }]}>{selected.symbol}</Text>
        <View style={styles.triggerInfo}>
          <Text style={[styles.triggerCode, { color: colors.textPrimary }]}>{selected.code}</Text>
          <Text style={[styles.triggerName, { color: colors.textTertiary }]}>{selected.name}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.gray500} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>SELECT CURRENCY</Text>
            <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.gray500} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search currencies…"
              placeholderTextColor={colors.textTertiary}
              autoFocus
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={c => c.code}
            contentContainerStyle={styles.list}
            renderItem={({ item: c }) => (
              <TouchableOpacity
                style={[
                  styles.option,
                  { borderBottomColor: colors.border },
                  c.code === value && { backgroundColor: colors.primary + '0D' },
                ]}
                onPress={() => { onChange(c.code); setOpen(false); setSearch(''); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionSymbol, { color: colors.textPrimary }]}>{c.symbol}</Text>
                <View style={styles.optionInfo}>
                  <Text style={[styles.optionCode, { color: colors.textPrimary }]}>{c.code}</Text>
                  <Text style={[styles.optionName, { color: colors.textTertiary }]}>{c.name}</Text>
                </View>
                {c.code === value && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  triggerSymbol: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'center' },
  triggerInfo: { flex: 1 },
  triggerCode: { fontSize: 15, fontWeight: '600' },
  triggerName: { fontSize: 11 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    gap: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionSymbol: { fontSize: 16, fontWeight: '700', width: 28, textAlign: 'center' },
  optionInfo: { flex: 1 },
  optionCode: { fontSize: 14, fontWeight: '600' },
  optionName: { fontSize: 12 },
});
