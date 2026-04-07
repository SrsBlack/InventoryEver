import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useColors } from '../../hooks/useColors';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import type { Item } from '../../types';

type ExportFormat = 'csv' | 'json';

export default function ExportScreen() {
  const { activeWorkspace } = useWorkspaceContext();
  const { items } = useItems(activeWorkspace?.id);
  const colors = useColors();
  const router = useRouter();
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeImageUrls, setIncludeImageUrls] = useState(true);
  const [exporting, setExporting] = useState(false);

  const buildCsv = (data: Item[]): string => {
    const headers = ['id', 'name', 'brand', 'model', 'serial_number', 'purchase_price', 'purchase_date', 'location', 'condition', 'notes'];
    if (includeImageUrls) headers.push('image_urls');
    const rows = data.map(item => {
      const cols: string[] = [
        item.id,
        item.name ?? '',
        item.brand ?? '',
        item.model ?? '',
        item.serial_number ?? '',
        String(item.purchase_price ?? ''),
        item.purchase_date ?? '',
        item.location ?? '',
        item.condition ?? '',
        ((item as any).notes ?? '').replace(/"/g, '""'),
      ];
      if (includeImageUrls) {
        const urls = (item as any).images?.map((img: any) => img.image_url).join(';') ?? '';
        cols.push(urls);
      }
      return cols.map(c => `"${c}"`).join(',');
    });
    return [headers.join(','), ...rows].join('\n');
  };

  const buildJson = (data: Item[]): string => {
    const cleaned = data.map(item => {
      const out: Record<string, unknown> = {
        id: item.id,
        name: item.name,
        brand: item.brand,
        model: item.model,
        serial_number: item.serial_number,
        purchase_price: item.purchase_price,
        purchase_date: item.purchase_date,
        location: item.location,
        condition: item.condition,
        notes: (item as any).notes ?? null,
      };
      if (includeImageUrls) {
        out.image_urls = (item as any).images?.map((img: any) => img.image_url) ?? [];
      }
      return out;
    });
    return JSON.stringify({ exported_at: new Date().toISOString(), items: cleaned }, null, 2);
  };

  const handleExport = async () => {
    if (!items.length) {
      Alert.alert('No Items', 'There are no items to export in this workspace.');
      return;
    }
    setExporting(true);
    try {
      const data = items; // allItems toggle reserved for future subset selection
      const content = format === 'csv' ? buildCsv(data) : buildJson(data);
      const ext = format === 'csv' ? 'csv' : 'json';
      const filename = `inventory_export_${Date.now()}.${ext}`;
      const uri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(uri, content, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: format === 'csv' ? 'text/csv' : 'application/json', dialogTitle: 'Export Inventory' });
      } else {
        Alert.alert('Exported', `File saved to cache: ${filename}`);
      }
    } catch (err) {
      Alert.alert('Export Failed', err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Export Data' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <TouchableOpacity
            onPress={() => router.push('/settings/import')}
            style={[styles.importBanner, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.importBannerText, { color: colors.primary }]}>Import data from CSV or JSON</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>

          <Text style={[styles.description, { color: colors.textSecondary }]}>Export your inventory data as CSV or JSON</Text>

          {/* Format picker */}
          <View style={styles.sectionHeader}>
            <Ionicons name="document-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Export Format</Text>
          </View>
          <View style={styles.formatRow}>
            <FormatButton label="CSV" active={format === 'csv'} onPress={() => setFormat('csv')} />
            <FormatButton label="JSON" active={format === 'json'} onPress={() => setFormat('json')} />
          </View>

          {/* Options */}
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>What to Export</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <ToggleRow
              label="Include Image URLs"
              value={includeImageUrls}
              onToggle={() => setIncludeImageUrls(v => !v)}
              isLast
            />
          </Card>

          <Button
            title={exporting ? 'Exporting...' : 'Export'}
            onPress={handleExport}
            loading={exporting}
            fullWidth
            size="lg"
            style={styles.exportBtn}
          />
        </View>
      </ScrollView>
    </>
  );
}

function FormatButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.formatBtn,
        { borderColor: colors.border, backgroundColor: colors.surface },
        active && { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
      ]}
    >
      <Text style={[styles.formatBtnText, { color: colors.textSecondary }, active && { color: colors.primary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
  isLast,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const colors = useColors();
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16 },
  importBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  importBannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionIcon: { marginRight: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  formatRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  formatBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  formatBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: { marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  exportBtn: { marginTop: 4 },
});
