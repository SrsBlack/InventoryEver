import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextStyle,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLending } from '../../hooks/useLending';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Item, BorrowerProfile } from '../../types';

export default function LendItemScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ itemId?: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { user } = useAuthContext();
  const { lendItem, borrowers } = useLending(activeWorkspace?.id);

  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState<Item[]>([]);
  const [showItemPicker, setShowItemPicker] = useState(!params.itemId);

  const [borrowerName, setBorrowerName] = useState('');
  const [borrowerPhone, setBorrowerPhone] = useState('');
  const [borrowerEmail, setBorrowerEmail] = useState('');
  const [showBorrowerSuggestions, setShowBorrowerSuggestions] = useState(false);

  const [quantity, setQuantity] = useState('1');
  const [expectedReturn, setExpectedReturn] = useState('');
  const [conditionLent, setConditionLent] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-load item if passed via params
  useEffect(() => {
    if (params.itemId && activeWorkspace?.id) {
      supabase
        .from('items')
        .select('id, name, main_image_url, condition, workspace_id')
        .eq('id', params.itemId)
        .single()
        .then(({ data }) => {
          if (data) {
            setSelectedItem(data as Item);
            setConditionLent(data.condition);
          }
        });
    }
  }, [params.itemId, activeWorkspace?.id]);

  // Search items
  useEffect(() => {
    if (!itemSearch.trim() || !activeWorkspace?.id) {
      setItemResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .select('id, name, main_image_url, condition')
        .eq('workspace_id', activeWorkspace.id)
        .ilike('name', `%${itemSearch}%`)
        .limit(8);
      setItemResults((data ?? []) as Item[]);
    }, 300);
    return () => clearTimeout(timer);
  }, [itemSearch, activeWorkspace?.id]);

  const borrowerSuggestions = borrowers.filter(b =>
    borrowerName.trim().length > 0 &&
    b.name.toLowerCase().includes(borrowerName.toLowerCase())
  ).slice(0, 5);

  const fillBorrower = (b: BorrowerProfile) => {
    setBorrowerName(b.name);
    setBorrowerPhone(b.phone ?? '');
    setBorrowerEmail(b.email ?? '');
    setShowBorrowerSuggestions(false);
  };

  const handleSubmit = async () => {
    if (!selectedItem) {
      Alert.alert('Required', 'Please select an item to lend.');
      return;
    }
    if (!borrowerName.trim()) {
      Alert.alert('Required', 'Please enter the borrower\'s name.');
      return;
    }
    if (!user?.id) return;

    setSubmitting(true);
    try {
      await lendItem({
        item_id: selectedItem.id,
        borrower_name: borrowerName.trim(),
        borrower_phone: borrowerPhone.trim() || undefined,
        borrower_email: borrowerEmail.trim() || undefined,
        quantity_lent: parseInt(quantity) || 1,
        expected_return_date: expectedReturn || undefined,
        condition_lent: conditionLent || selectedItem.condition,
        notes: notes.trim() || undefined,
        created_by: user.id,
      });
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create lending record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Lend Item',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', letterSpacing: 1 } as any,
        }}
      />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section: Item */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ITEM</Text>

          {selectedItem ? (
            <View style={[styles.selectedItem, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <View style={styles.selectedItemInfo}>
                <Ionicons name="cube-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.selectedItemName, { color: colors.textPrimary }]}>{selectedItem.name}</Text>
              </View>
              <TouchableOpacity onPress={() => { setSelectedItem(null); setShowItemPicker(true); }}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Input
                label="Search items"
                placeholder="Type item name..."
                value={itemSearch}
                onChangeText={setItemSearch}
                icon="search"
              />
              {itemResults.length > 0 && (
                <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {itemResults.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                      onPress={() => {
                        setSelectedItem(item);
                        setConditionLent(item.condition);
                        setItemSearch('');
                        setItemResults([]);
                        setShowItemPicker(false);
                      }}
                    >
                      <Ionicons name="cube-outline" size={14} color={colors.textTertiary} style={{ marginRight: 8 }} />
                      <Text style={[styles.suggestionText, { color: colors.textPrimary }]}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section: Borrower */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>BORROWER</Text>

          <View>
            <Input
              label="Name *"
              placeholder="Who are you lending to?"
              value={borrowerName}
              onChangeText={v => { setBorrowerName(v); setShowBorrowerSuggestions(true); }}
              icon="person"
              required
            />
            {showBorrowerSuggestions && borrowerSuggestions.length > 0 && (
              <View style={[styles.suggestions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {borrowerSuggestions.map(b => (
                  <TouchableOpacity
                    key={b.id}
                    style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                    onPress={() => fillBorrower(b)}
                  >
                    <Ionicons name="person-outline" size={14} color={colors.textTertiary} style={{ marginRight: 8 }} />
                    <View style={styles.borrowerSuggestionInfo}>
                      <Text style={[styles.suggestionText, { color: colors.textPrimary }]}>{b.name}</Text>
                      <Text style={[styles.suggestionSub, { color: colors.textTertiary }]}>
                        {b.total_borrowed} borrowed · {b.overdue_count > 0 ? `${b.overdue_count} overdue` : 'reliable'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Input
            label="Phone"
            placeholder="+1 (555) 000-0000"
            value={borrowerPhone}
            onChangeText={setBorrowerPhone}
            keyboardType="phone-pad"
            icon="call"
          />

          <Input
            label="Email"
            placeholder="borrower@example.com"
            value={borrowerEmail}
            onChangeText={setBorrowerEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            icon="mail"
          />

          {/* Section: Details */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DETAILS</Text>

          <Input
            label="Quantity"
            placeholder="1"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            icon="layers"
          />

          <Input
            label="Expected Return Date"
            placeholder="YYYY-MM-DD"
            value={expectedReturn}
            onChangeText={setExpectedReturn}
            icon="calendar"
          />

          <Input
            label="Condition When Lent"
            placeholder="e.g. Good, Like new"
            value={conditionLent}
            onChangeText={setConditionLent}
            icon="star"
          />

          <Input
            label="Notes"
            placeholder="Any additional notes..."
            value={notes}
            onChangeText={setNotes}
            icon="document-text"
            multiline
          />

          <Button
            title="Confirm Lending"
            onPress={handleSubmit}
            loading={submitting}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 20,
  },
  selectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 6,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 12,
    marginBottom: 8,
  },
  selectedItemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectedItemName: { fontSize: 14, fontWeight: '600', flex: 1 },
  suggestions: {
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  suggestionText: { fontSize: 14 },
  suggestionSub: { fontSize: 11, marginTop: 2 },
  borrowerSuggestionInfo: { flex: 1 },
});
