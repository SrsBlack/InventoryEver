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
import { Stack } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors } from '../../constants/colors';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import type { Item } from '../../types';

type ExportFormat = 'csv' | 'json';

export default function ExportScreen() {
  const { activeWorkspace } = useWorkspaceContext();
  const { items } = useItems(activeWorkspace?.id);
  const [format, setFormat] = useState<ExportFormat>('csv');
  const [includeImageUrls, setIncludeImageUrls] = useState(true);
  const [includeMaintenanceLogs, setIncludeMaintenanceLogs] = useState(false);
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <Text style={styles.description}>Export your inventory data as CSV or JSON</Text>

          {/* Format picker */}
          <View style={styles.sectionHeader}>
            <Ionicons name="document-outline" size={18} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Export Format</Text>
          </View>
          <View style={styles.formatRow}>
            <FormatButton label="CSV" active={format === 'csv'} onPress={() => setFormat('csv')} />
            <FormatButton label="JSON" active={format === 'json'} onPress={() => setFormat('json')} />
          </View>

          {/* Options */}
          <View style={styles.sectionHeader}>
            <Ionicons name="options-outline" size={18} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>What to Export</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <ToggleRow
              label="Include Image URLs"
              value={includeImageUrls}
              onToggle={() => setIncludeImageUrls(v => !v)}
              isLast={false}
            />
            <ToggleRow
              label="Include Maintenance Logs"
              value={includeMaintenanceLogs}
              onToggle={() => setIncludeMaintenanceLogs(v => !v)}
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
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.formatBtn, active && styles.formatBtnActive]}
    >
      <Text style={[styles.formatBtnText, active && styles.formatBtnTextActive]}>{label}</Text>
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
  return (
    <View style={[styles.row, !isLast && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.gray200, true: Colors.primary + '66' }}
        thumbColor={value ? Colors.primary : Colors.gray400}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  body: { padding: 16 },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
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
    color: Colors.textPrimary,
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
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  formatBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  formatBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  formatBtnTextActive: {
    color: Colors.primary,
  },
  card: { marginBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  exportBtn: { marginTop: 4 },
});
