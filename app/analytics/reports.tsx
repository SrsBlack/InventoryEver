import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useColors } from '../../hooks/useColors';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import {
  filterByPeriod,
  computeSummary,
  computeValueByCategory,
  computeValueByLocation,
  computeTopValueItems,
  computeInsights,
  buildEnhancedCsv,
  buildReportHtml,
  type TimePeriodFilter,
} from '../../lib/analyticsData';

type ExportFormat = 'csv' | 'json' | 'pdf';

const PERIODS: { label: string; value: TimePeriodFilter }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'This Year', value: 'year' },
  { label: 'Last 30 Days', value: 'month30' },
];

const PERIOD_LABELS: Record<TimePeriodFilter, string> = {
  all: 'all-time',
  year: 'this-year',
  month30: 'last-30d',
};

export default function ReportsScreen() {
  const colors = useColors();
  const { activeWorkspace } = useWorkspaceContext();
  const { items, loading, hasMore, loadMore } = useItems(activeWorkspace?.id);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [period, setPeriod] = useState<TimePeriodFilter>('all');
  const [includeImages, setIncludeImages] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Exhaust pagination
  useEffect(() => {
    if (hasMore && !loading) loadMore();
  }, [hasMore, loading]);

  const isLoadingAll = loading || hasMore;

  const filteredItems = useMemo(() => filterByPeriod(items, period), [items, period]);

  const handleExport = async () => {
    if (isLoadingAll) {
      Alert.alert('Loading', 'Please wait for all items to load before exporting.');
      return;
    }
    if (filteredItems.length === 0) {
      Alert.alert('No Items', 'There are no items to export for the selected period.');
      return;
    }

    setExporting(true);
    try {
      const ts = Date.now();
      const periodLabel = PERIOD_LABELS[period];
      const workspaceName = activeWorkspace?.name ?? 'My Inventory';

      if (format === 'csv') {
        const content = buildEnhancedCsv(filteredItems);
        const filename = `inventory_report_${periodLabel}_${ts}.csv`;
        const uri = (FileSystem.cacheDirectory ?? '') + filename;
        await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'text/csv', dialogTitle: 'Export CSV Report' });
        } else {
          Alert.alert('Exported', `Saved to cache: ${filename}`);
        }

      } else if (format === 'json') {
        const data = filteredItems.map(item => ({
          id: item.id,
          name: item.name,
          brand: item.brand ?? null,
          model: item.model ?? null,
          serial_number: item.serial_number ?? null,
          quantity: item.quantity,
          condition: item.condition,
          purchase_price: item.purchase_price ?? null,
          current_value: item.current_value ?? null,
          currency: item.currency,
          purchase_date: item.purchase_date ?? null,
          warranty_expiry_date: item.warranty_expiry_date ?? null,
          category_name: item.category?.name ?? null,
          location_full_path: (item as any).location_data?.full_path ?? item.location ?? null,
          location_name: (item as any).location_data?.name ?? null,
          ...(includeImages ? { image_urls: (item as any).images?.map((img: any) => img.image_url) ?? [] } : {}),
        }));
        const content = JSON.stringify(
          { exported_at: new Date().toISOString(), workspace: workspaceName, period, items: data },
          null,
          2,
        );
        const filename = `inventory_report_${periodLabel}_${ts}.json`;
        const uri = (FileSystem.cacheDirectory ?? '') + filename;
        await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Export JSON Report' });
        } else {
          Alert.alert('Exported', `Saved to cache: ${filename}`);
        }

      } else {
        // PDF
        const summary = computeSummary(filteredItems);
        const byCategory = computeValueByCategory(filteredItems);
        const byLocation = computeValueByLocation(filteredItems);
        const topItems = computeTopValueItems(filteredItems);
        const insights = computeInsights(filteredItems);
        const html = buildReportHtml(
          filteredItems,
          summary,
          insights,
          topItems,
          byCategory,
          byLocation,
          period,
          workspaceName,
        );

        try {
          const { uri: pdfUri } = await Print.printToFileAsync({ html, base64: false });
          const filename = `inventory_report_${periodLabel}_${ts}.pdf`;
          const destUri = (FileSystem.cacheDirectory ?? '') + filename;
          await FileSystem.moveAsync({ from: pdfUri, to: destUri });
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(destUri, { mimeType: 'application/pdf', dialogTitle: 'Export PDF Report' });
          } else {
            Alert.alert('Exported', `PDF saved to cache: ${filename}`);
          }
        } catch {
          // Fallback: open native print dialog
          await Print.printAsync({ html });
        }
      }
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Export Report', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>

        {isLoadingAll && (
          <View style={[styles.loadingBanner, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
            <Ionicons name="sync-outline" size={14} color={colors.primary} />
            <Text style={[styles.loadingBannerText, { color: colors.primary }]}>Loading all items…</Text>
          </View>
        )}

        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Export your inventory as CSV, JSON, or a full PDF analytics report.
        </Text>

        {/* Format picker */}
        <View style={styles.sectionHeader}>
          <Ionicons name="document-outline" size={16} color={colors.primary} style={styles.sectionIcon} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Export Format</Text>
        </View>
        <View style={styles.formatRow}>
          <FormatButton label="CSV" active={format === 'csv'} onPress={() => setFormat('csv')} colors={colors} />
          <FormatButton label="JSON" active={format === 'json'} onPress={() => setFormat('json')} colors={colors} />
          <FormatButton label="PDF" active={format === 'pdf'} onPress={() => setFormat('pdf')} colors={colors} />
        </View>

        {/* Period picker */}
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary} style={styles.sectionIcon} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Time Period</Text>
        </View>
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.value}
              onPress={() => setPeriod(p.value)}
              style={[
                styles.periodChip,
                { borderColor: colors.border, backgroundColor: colors.surface },
                period === p.value && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
              ]}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.periodChipText,
                { color: colors.textSecondary },
                period === p.value && { color: colors.primary },
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Items count preview */}
        <View style={styles.previewRow}>
          <Ionicons name="cube-outline" size={14} color={colors.gray500} />
          <Text style={[styles.previewText, { color: colors.textTertiary }]}>
            {isLoadingAll ? 'Counting items…' : `${filteredItems.length} item${filteredItems.length !== 1 ? 's' : ''} will be exported`}
          </Text>
        </View>

        {/* Options */}
        {format !== 'pdf' && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="options-outline" size={16} color={colors.primary} style={styles.sectionIcon} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Options</Text>
            </View>
            <Card variant="bordered" padding={0} style={styles.card}>
              <ToggleRow
                label="Include Image URLs"
                value={includeImages}
                onToggle={() => setIncludeImages(v => !v)}
                isLast
                colors={colors}
              />
            </Card>
          </>
        )}

        {format === 'pdf' && (
          <View style={[styles.pdfNote, { backgroundColor: colors.infoLight, borderColor: colors.info + '40' }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.info} />
            <Text style={[styles.pdfNoteText, { color: colors.textSecondary }]}>
              PDF includes summary, value breakdown by category and location, top 5 items, and insights.
            </Text>
          </View>
        )}

        <Button
          title={exporting ? 'Exporting…' : `Export ${format.toUpperCase()}`}
          onPress={handleExport}
          loading={exporting}
          fullWidth
          size="lg"
          style={styles.exportBtn}
        />
      </ScrollView>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormatButton({ label, active, onPress, colors }: { label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.formatBtn,
        { borderColor: colors.border, backgroundColor: colors.surface },
        active && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
      ]}
      activeOpacity={0.8}
    >
      <Text style={[styles.formatBtnText, { color: colors.textSecondary }, active && { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onToggle, isLast, colors }: { label: string; value: boolean; onToggle: () => void; isLast: boolean; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: colors.gray200, true: colors.primary + '66' }}
        thumbColor={value ? colors.primary : colors.gray400}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16, paddingBottom: 40 },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  loadingBannerText: { fontSize: 12, fontWeight: '500' },
  description: { fontSize: 14, marginBottom: 20, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 8 },
  sectionIcon: { marginRight: 6 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  formatRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  formatBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  formatBtnText: { fontSize: 14, fontWeight: '600' },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  periodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodChipText: { fontSize: 11, fontWeight: '600' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  previewText: { fontSize: 12 },
  card: { marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  pdfNote: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 6,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  pdfNoteText: { flex: 1, fontSize: 12, lineHeight: 18 },
  exportBtn: { marginTop: 4 },
});
