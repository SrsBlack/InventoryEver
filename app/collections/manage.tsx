import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useCollections } from '../../hooks/useCollections';
import { useCategories } from '../../hooks/useCategories';
import { useColors } from '../../hooks/useColors';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import type { SmartRules, Collection } from '../../types';

const EMOJI_OPTIONS = ['📚', '⭐', '🏠', '💼', '🎮', '🔧', '📦', '🏆', '💡', '🎁', '🔒', '🌿'];
const COLOR_OPTIONS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#F97316'];
const CONDITIONS = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'];
const WARRANTY_STATUSES = [
  { value: 'valid', label: 'Valid' },
  { value: 'expiring', label: 'Expiring' },
  { value: 'expired', label: 'Expired' },
  { value: 'none', label: 'No Warranty' },
];

export default function ManageCollectionScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspaceContext();
  const { collections, createCollection, updateCollection } = useCollections(activeWorkspace?.id);
  const { categories } = useCategories(activeWorkspace?.id);

  const existing = id ? collections.find(c => c.id === id) : undefined;
  const isEditing = !!existing;

  // Form state
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [emoji, setEmoji] = useState(existing?.icon_emoji ?? '📚');
  const [color, setColor] = useState(existing?.color_hex ?? '#8B5CF6');
  const [isSmart, setIsSmart] = useState(existing?.collection_type === 'smart');
  const [saving, setSaving] = useState(false);

  // Smart rules state
  const [ruleSearch, setRuleSearch] = useState((existing?.smart_rules as SmartRules)?.search ?? '');
  const [ruleCategoryId, setRuleCategoryId] = useState((existing?.smart_rules as SmartRules)?.category_id ?? '');
  const [ruleCondition, setRuleCondition] = useState((existing?.smart_rules as SmartRules)?.condition ?? '');
  const [ruleMinPrice, setRuleMinPrice] = useState(String((existing?.smart_rules as SmartRules)?.min_price ?? ''));
  const [ruleMaxPrice, setRuleMaxPrice] = useState(String((existing?.smart_rules as SmartRules)?.max_price ?? ''));
  const [ruleWarranty, setRuleWarranty] = useState<string[]>((existing?.smart_rules as SmartRules)?.warranty_status ?? []);

  const toggleWarranty = (val: string) => {
    setRuleWarranty(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val],
    );
  };

  const buildSmartRules = (): SmartRules => {
    const rules: SmartRules = {};
    if (ruleSearch.trim()) rules.search = ruleSearch.trim();
    if (ruleCategoryId) rules.category_id = ruleCategoryId;
    if (ruleCondition) rules.condition = ruleCondition;
    if (ruleMinPrice) rules.min_price = Number(ruleMinPrice);
    if (ruleMaxPrice) rules.max_price = Number(ruleMaxPrice);
    if (ruleWarranty.length > 0) rules.warranty_status = ruleWarranty;
    return rules;
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Please enter a collection name.'); return; }
    if (!user?.id) return;
    setSaving(true);
    try {
      if (isEditing && existing) {
        await updateCollection(existing.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          icon_emoji: emoji,
          color_hex: color,
          smart_rules: isSmart ? buildSmartRules() : undefined,
        });
      } else {
        const created = await createCollection(
          {
            name: name.trim(),
            description: description.trim() || undefined,
            icon_emoji: emoji,
            color_hex: color,
            collection_type: isSmart ? 'smart' : 'manual',
            smart_rules: isSmart ? buildSmartRules() : undefined,
          },
          user.id,
        );
        if (created) {
          router.replace(`/collections/${created.id}` as `/${string}`);
          return;
        }
      }
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEditing ? 'EDIT COLLECTION' : 'NEW COLLECTION'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Name */}
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>NAME</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          value={name}
          onChangeText={setName}
          placeholder="Collection name…"
          placeholderTextColor={colors.textTertiary}
          maxLength={60}
        />

        {/* Description */}
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>DESCRIPTION (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.inputMulti, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What's in this collection?"
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={2}
          maxLength={200}
        />

        {/* Emoji */}
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>ICON</Text>
        <View style={styles.emojiRow}>
          {EMOJI_OPTIONS.map(e => (
            <TouchableOpacity
              key={e}
              style={[styles.emojiBtn, { borderColor: emoji === e ? color : colors.border, backgroundColor: emoji === e ? color + '22' : 'transparent' }]}
              onPress={() => setEmoji(e)}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Color */}
        <Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>COLOR</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: colors.textPrimary }]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        {/* Type toggle */}
        <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.toggleInfo}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Smart Collection</Text>
            <Text style={[styles.toggleSubtitle, { color: colors.textTertiary }]}>Auto-populate items based on rules</Text>
          </View>
          <Switch
            value={isSmart}
            onValueChange={val => { if (!isEditing) setIsSmart(val); }}
            trackColor={{ false: colors.gray200, true: colors.primary + '66' }}
            thumbColor={isSmart ? colors.primary : colors.gray400}
            disabled={isEditing}
          />
        </View>

        {/* Smart rules */}
        {isSmart && (
          <Card variant="bordered" style={styles.rulesCard}>
            <Text style={[styles.rulesTitle, { color: colors.textTertiary }]}>SMART RULES</Text>
            <Text style={[styles.rulesHint, { color: colors.textSecondary }]}>Items matching ALL set rules will appear automatically.</Text>

            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Name contains</Text>
            <TextInput
              style={[styles.ruleInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={ruleSearch}
              onChangeText={setRuleSearch}
              placeholder="e.g. Camera"
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    !ruleCategoryId && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                  ]}
                  onPress={() => setRuleCategoryId('')}
                >
                  <Text style={[styles.chipText, { color: !ruleCategoryId ? colors.primary : colors.textSecondary }, !ruleCategoryId && { fontWeight: '700' }]}>Any</Text>
                </TouchableOpacity>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.chip,
                      { borderColor: colors.border, backgroundColor: colors.background },
                      ruleCategoryId === cat.id && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                    ]}
                    onPress={() => setRuleCategoryId(ruleCategoryId === cat.id ? '' : cat.id)}
                  >
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>{cat.icon_emoji} {cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Condition</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.background },
                  !ruleCondition && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                ]}
                onPress={() => setRuleCondition('')}
              >
                <Text style={[styles.chipText, { color: !ruleCondition ? colors.primary : colors.textSecondary }, !ruleCondition && { fontWeight: '700' }]}>Any</Text>
              </TouchableOpacity>
              {CONDITIONS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    ruleCondition === c && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                  ]}
                  onPress={() => setRuleCondition(ruleCondition === c ? '' : c)}
                >
                  <Text style={[styles.chipText, { color: ruleCondition === c ? colors.primary : colors.textSecondary }, ruleCondition === c && { fontWeight: '700' }]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Price Range</Text>
            <View style={styles.priceRow}>
              <View style={[styles.priceInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.priceSymbol, { color: colors.textTertiary }]}>$</Text>
                <TextInput
                  style={[styles.priceTextInput, { color: colors.textPrimary }]}
                  value={ruleMinPrice}
                  onChangeText={setRuleMinPrice}
                  placeholder="Min"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <Text style={[styles.priceDash, { color: colors.textTertiary }]}>—</Text>
              <View style={[styles.priceInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.priceSymbol, { color: colors.textTertiary }]}>$</Text>
                <TextInput
                  style={[styles.priceTextInput, { color: colors.textPrimary }]}
                  value={ruleMaxPrice}
                  onChangeText={setRuleMaxPrice}
                  placeholder="Max"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.ruleLabel, { color: colors.textSecondary }]}>Warranty Status</Text>
            <View style={styles.chipRow}>
              {WARRANTY_STATUSES.map(ws => (
                <TouchableOpacity
                  key={ws.value}
                  style={[
                    styles.chip,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    ruleWarranty.includes(ws.value) && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                  ]}
                  onPress={() => toggleWarranty(ws.value)}
                >
                  <Text style={[styles.chipText, { color: ruleWarranty.includes(ws.value) ? colors.primary : colors.textSecondary }, ruleWarranty.includes(ws.value) && { fontWeight: '700' }]}>
                    {ws.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        <Button
          title={saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Collection'}
          onPress={handleSave}
          loading={saving}
          fullWidth
          size="lg"
          style={styles.saveBtn}
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 22 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
    gap: 12,
  },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: '600' },
  toggleSubtitle: { fontSize: 12, marginTop: 2 },
  rulesCard: { marginTop: 12, gap: 8 },
  rulesTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 4 },
  rulesHint: { fontSize: 12, marginBottom: 8 },
  ruleLabel: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  ruleInput: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  chipScroll: { marginHorizontal: -4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  priceSymbol: { fontSize: 14, marginRight: 4 },
  priceTextInput: { flex: 1, fontSize: 14 },
  priceDash: { fontSize: 16 },
  saveBtn: { marginTop: 24 },
});
