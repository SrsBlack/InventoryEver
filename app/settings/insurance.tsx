import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack } from 'expo-router';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useColors } from '../../hooks/useColors';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { useCategories } from '../../hooks/useCategories';
import {
  buildInsuranceLineItems,
  computeInsuranceSummary,
  buildInsuranceHtml,
  type InsuranceReportOptions,
} from '../../lib/insuranceReport';
import { formatCurrencyAmount } from '../../lib/depreciation';

type ValuationType = InsuranceReportOptions['valuationType'];
type GroupBy = InsuranceReportOptions['groupBy'];

const VALUATION_OPTIONS: { value: ValuationType; label: string; desc: string }[] = [
  { value: 'purchase', label: 'Purchase Price', desc: 'Original cost when bought' },
  { value: 'current', label: 'Current Value', desc: 'Current estimated value' },
  { value: 'replacement', label: 'Replacement Value', desc: 'Cost to replace today (+15%)' },
];

const GROUP_OPTIONS: { value: GroupBy; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'category', label: 'By Category', icon: 'folder-outline' },
  { value: 'location', label: 'By Location', icon: 'location-outline' },
  { value: 'none', label: 'No Grouping', icon: 'list-outline' },
];

export default function InsuranceScreen() {
  const { activeWorkspace } = useWorkspaceContext();
  const { items, hasMore, loading, loadMore } = useItems(activeWorkspace?.id);
  const { categories } = useCategories(activeWorkspace?.id ?? null);
  const colors = useColors();

  // Exhaust pagination
  useEffect(() => {
    if (hasMore && !loading) loadMore();
  }, [hasMore, loading]);

  // Form state
  const [ownerName, setOwnerName] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [claimDate, setClaimDate] = useState('');
  const [valuationType, setValuationType] = useState<ValuationType>('replacement');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [includeImages, setIncludeImages] = useState(false);
  const [includeSerialNumbers, setIncludeSerialNumbers] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(false);
  const [minValue, setMinValue] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);

  const options: InsuranceReportOptions = useMemo(() => ({
    workspaceName: activeWorkspace?.name ?? 'My Inventory',
    ownerName: ownerName.trim() || undefined,
    policyNumber: policyNumber.trim() || undefined,
    claimDate: claimDate.trim() || undefined,
    includeImages,
    includeSerialNumbers,
    includeReceipts,
    valuationType,
    groupBy,
    filterCategoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    minValue: minValue ? parseFloat(minValue) : undefined,
  }), [activeWorkspace, ownerName, policyNumber, claimDate, includeImages, includeSerialNumbers,
      includeReceipts, valuationType, groupBy, selectedCategories, minValue]);

  const { lineItems, summary } = useMemo(() => {
    if (hasMore || loading) return { lineItems: [], summary: null };
    const li = buildInsuranceLineItems(items, options);
    return { lineItems: li, summary: computeInsuranceSummary(li) };
  }, [items, options, hasMore, loading]);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id],
    );
  };

  const handleGeneratePdf = async () => {
    if (lineItems.length === 0) {
      Alert.alert('No Items', 'No items match the current filters.');
      return;
    }
    setGenerating(true);
    try {
      const html = buildInsuranceHtml(lineItems, summary!, options);
      let uri: string;
      try {
        const result = await (Print as any).printToFileAsync({ html, base64: false });
        uri = result.uri;
      } catch {
        // Fallback: print directly (no file sharing)
        await (Print as any).printAsync({ html });
        setGenerating(false);
        return;
      }
      const timestamp = Date.now();
      const dest = `${FileSystem.documentDirectory}insurance_report_${timestamp}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate PDF.');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportCsv = async () => {
    if (lineItems.length === 0) {
      Alert.alert('No Items', 'No items match the current filters.');
      return;
    }
    setGenerating(true);
    try {
      const headers = [
        'id', 'name', 'brand', 'model', 'serial_number', 'category', 'location',
        'condition', 'purchase_date', 'purchase_price', 'current_value',
        'reported_value', 'currency', 'warranty_expiry',
        ...(includeImages ? ['image_url'] : []),
        ...(includeReceipts ? ['receipt_url'] : []),
      ];
      const esc = (v: string | number | undefined) => {
        const s = String(v ?? '');
        return `"${s.replace(/"/g, '""')}"`;
      };
      const rows = lineItems.map(item => [
        esc(item.id), esc(item.name), esc(item.brand), esc(item.model),
        esc(item.serial_number), esc(item.category), esc(item.location),
        esc(item.condition), esc(item.purchase_date), esc(item.purchase_price),
        esc(item.current_value), esc(item.reported_value), esc(item.currency),
        esc(item.warranty_expiry),
        ...(includeImages ? [esc(item.image_url)] : []),
        ...(includeReceipts ? [esc(item.receipt_url)] : []),
      ].join(','));
      const csv = [headers.join(','), ...rows].join('\n');
      const timestamp = Date.now();
      const path = `${FileSystem.documentDirectory}insurance_${timestamp}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
    } catch (e: any) {
      Alert.alert('Export Failed', e?.message ?? 'Could not generate CSV.');
    } finally {
      setGenerating(false);
    }
  };

  const isLoading = hasMore || loading;

  return (
    <>
      <Stack.Screen options={{
        title: 'Insurance Report',
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
      }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Preview summary */}
          {isLoading ? (
            <View style={[styles.loadingRow, { backgroundColor: colors.surface }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading items…</Text>
            </View>
          ) : (
            <Card variant="bordered" style={styles.previewCard}>
              <View style={styles.previewRow}>
                <View style={styles.previewStat}>
                  <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{summary?.totalItems ?? 0}</Text>
                  <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>ITEMS</Text>
                </View>
                <View style={[styles.previewStat, styles.previewStatBig, { borderColor: colors.border }]}>
                  <Text style={[styles.previewValue, styles.previewValueBig, { color: colors.primary }]}>
                    {summary ? formatCurrencyAmount(summary.totalValue) : '$0'}
                  </Text>
                  <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>TOTAL VALUE</Text>
                </View>
                <View style={styles.previewStat}>
                  <Text style={[styles.previewValue, { color: colors.textPrimary }]}>{summary?.categoryCount ?? 0}</Text>
                  <Text style={[styles.previewLabel, { color: colors.textTertiary }]}>CATEGORIES</Text>
                </View>
              </View>
            </Card>
          )}

          {/* Owner / Policy Info */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>POLICY INFORMATION</Text>
          </View>
          <Card variant="bordered" style={styles.formCard}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Owner Name</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary }]}
                value={ownerName}
                onChangeText={setOwnerName}
                placeholder="Full name on policy"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={[styles.fieldRow, styles.fieldRowBorder, { borderTopColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Policy Number</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary }]}
                value={policyNumber}
                onChangeText={setPolicyNumber}
                placeholder="e.g. HO-1234567"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
            <View style={[styles.fieldRow, styles.fieldRowBorder, { borderTopColor: colors.border }]}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Claim / Report Date</Text>
              <TextInput
                style={[styles.fieldInput, { color: colors.textPrimary }]}
                value={claimDate}
                onChangeText={setClaimDate}
                placeholder="e.g. 2025-01-15"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </Card>

          {/* Valuation Method */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>VALUATION METHOD</Text>
          </View>
          {VALUATION_OPTIONS.map(v => (
            <TouchableOpacity
              key={v.value}
              style={[
                styles.optionRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                valuationType === v.value && { borderColor: colors.primary, backgroundColor: colors.primary + '0D' },
              ]}
              onPress={() => setValuationType(v.value)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, { borderColor: colors.border }, valuationType === v.value && { borderColor: colors.primary }]}>
                {valuationType === v.value && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.optionInfo}>
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>{v.label}</Text>
                <Text style={[styles.optionDesc, { color: colors.textTertiary }]}>{v.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Group By */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>GROUP BY</Text>
          </View>
          <View style={styles.chipRow}>
            {GROUP_OPTIONS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[
                  styles.chip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  groupBy === g.value && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                ]}
                onPress={() => setGroupBy(g.value)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={g.icon}
                  size={14}
                  color={groupBy === g.value ? colors.primary : colors.textSecondary}
                />
                <Text style={[styles.chipText, { color: colors.textSecondary }, groupBy === g.value && { color: colors.primary, fontWeight: '600' }]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Filters */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>FILTERS</Text>
          </View>
          <Card variant="bordered" style={styles.formCard}>
            <View style={styles.fieldRow}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Min Value ($)</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputShort, { color: colors.textPrimary }]}
                value={minValue}
                onChangeText={setMinValue}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </Card>

          {categories.length > 0 && (
            <>
              <Text style={[styles.filterSubLabel, { color: colors.textTertiary }]}>Filter by Category (leave empty = all)</Text>
              <View style={styles.categoryChips}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      selectedCategories.includes(cat.id) && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
                    ]}
                    onPress={() => toggleCategory(cat.id)}
                    activeOpacity={0.8}
                  >
                    {cat.icon_emoji ? <Text style={styles.catEmoji}>{cat.icon_emoji}</Text> : null}
                    <Text style={[styles.catChipText, { color: colors.textSecondary }, selectedCategories.includes(cat.id) && { color: colors.primary, fontWeight: '600' }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Include Options */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>INCLUDE IN REPORT</Text>
          </View>
          <Card variant="bordered" style={styles.formCard}>
            <ToggleRow
              label="Serial Numbers & Models"
              value={includeSerialNumbers}
              onChange={setIncludeSerialNumbers}
            />
            <ToggleRow
              label="Image URLs"
              value={includeImages}
              onChange={setIncludeImages}
              bordered
            />
            <ToggleRow
              label="Receipt URLs"
              value={includeReceipts}
              onChange={setIncludeReceipts}
              bordered
            />
          </Card>

          {/* Actions */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>EXPORT</Text>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnPrimary, { backgroundColor: colors.primary }, (isLoading || generating) && styles.exportBtnDisabled]}
              onPress={handleGeneratePdf}
              disabled={isLoading || generating}
              activeOpacity={0.8}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="document-text" size={18} color="#fff" />
              )}
              <Text style={styles.exportBtnPrimaryText}>Generate PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.exportBtn, styles.exportBtnSecondary, { backgroundColor: colors.surface, borderColor: colors.primary }, (isLoading || generating) && styles.exportBtnDisabled]}
              onPress={handleExportCsv}
              disabled={isLoading || generating}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={18} color={colors.primary} />
              <Text style={[styles.exportBtnSecondaryText, { color: colors.primary }]}>Export CSV</Text>
            </TouchableOpacity>
          </View>

          {summary && summary.highestValueItem && (
            <Card variant="bordered" style={styles.tipCard}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                Highest value item: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{summary.highestValueItem.name}</Text>
                {' '}({formatCurrencyAmount(summary.highestValueItem.value, summary.highestValueItem.currency)})
              </Text>
            </Card>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  bordered = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  bordered?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={[styles.toggleRow, bordered && { borderTopWidth: 1, borderTopColor: colors.border }]}>
      <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.gray300, true: colors.primary + '66' }}
        thumbColor={value ? colors.primary : colors.gray400}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },

  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderRadius: 8, marginBottom: 12 },
  loadingText: { fontSize: 13 },

  previewCard: { marginBottom: 4 },
  previewRow: { flexDirection: 'row', alignItems: 'center' },
  previewStat: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  previewStatBig: { borderLeftWidth: 1, borderRightWidth: 1 },
  previewValue: { fontSize: 18, fontWeight: '800' },
  previewValueBig: { fontSize: 20 },
  previewLabel: { fontSize: 9, letterSpacing: 0.8, marginTop: 2 },

  sectionHeader: { marginTop: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },

  formCard: { marginBottom: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  fieldRowBorder: { borderTopWidth: 1 },
  fieldLabel: { width: 130, fontSize: 13, fontWeight: '500' },
  fieldInput: { flex: 1, fontSize: 13 },
  fieldInputShort: { flex: 0, width: 80 },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optionInfo: { flex: 1 },
  optionLabel: { fontSize: 14, fontWeight: '600' },
  optionDesc: { fontSize: 11, marginTop: 1 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13 },

  filterSubLabel: { fontSize: 11, marginTop: 8, marginBottom: 8 },
  categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catEmoji: { fontSize: 14 },
  catChipText: { fontSize: 12 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  toggleLabel: { flex: 1, fontSize: 13 },

  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  exportBtnPrimary: {},
  exportBtnSecondary: { borderWidth: 1 },
  exportBtnDisabled: { opacity: 0.5 },
  exportBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  exportBtnSecondaryText: { fontSize: 14, fontWeight: '700' },

  tipCard: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 18 },
});
