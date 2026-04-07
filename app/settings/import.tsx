import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useColors } from '../../hooks/useColors';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { supabase } from '../../lib/supabase';
import type { ItemCondition } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ParsedItem {
  name: string;
  brand?: string;
  model?: string;
  condition?: ItemCondition;
  purchase_price?: number;
  purchase_date?: string;
  serial_number?: string;
  notes?: string;
  location?: string;
  warranty_expiry_date?: string;
  quantity?: number;
}

interface ParseResult {
  items: ParsedItem[];
  skipped: number;
  errors: string[];
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

const VALID_CONDITIONS: ItemCondition[] = ['new', 'excellent', 'good', 'fair', 'poor', 'damaged'];

function parseCsvRow(row: string): string[] {
  const cols: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsv(text: string): ParseResult {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) {
    return { items: [], skipped: 0, errors: ['CSV must have a header row and at least one data row.'] };
  }

  const headers = parseCsvRow(lines[0]).map(h => h.toLowerCase().replace(/[^a-z_]/g, '_'));
  const items: ParsedItem[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvRow(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });

    const name = row['name']?.trim();
    if (!name) {
      skipped++;
      errors.push(`Row ${i + 1}: skipped — missing required field "name".`);
      continue;
    }

    const item: ParsedItem = { name };

    if (row['brand']?.trim()) item.brand = row['brand'].trim();
    if (row['model']?.trim()) item.model = row['model'].trim();
    if (row['serial_number']?.trim()) item.serial_number = row['serial_number'].trim();
    if (row['notes']?.trim()) item.notes = row['notes'].trim();
    if (row['location']?.trim()) item.location = row['location'].trim();

    const condRaw = row['condition']?.trim().toLowerCase() as ItemCondition;
    if (condRaw && VALID_CONDITIONS.includes(condRaw)) {
      item.condition = condRaw;
    } else if (condRaw) {
      errors.push(`Row ${i + 1}: unknown condition "${condRaw}", defaulting to "good".`);
      item.condition = 'good';
    }

    const priceRaw = row['purchase_price']?.trim();
    if (priceRaw) {
      const price = parseFloat(priceRaw.replace(/[^0-9.-]/g, ''));
      if (!isNaN(price)) item.purchase_price = price;
      else errors.push(`Row ${i + 1}: invalid purchase_price "${priceRaw}", ignored.`);
    }

    const dateRaw = row['purchase_date']?.trim();
    if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      item.purchase_date = dateRaw;
    } else if (dateRaw) {
      errors.push(`Row ${i + 1}: purchase_date "${dateRaw}" is not YYYY-MM-DD, ignored.`);
    }

    const warrantyRaw = row['warranty_expiry_date']?.trim();
    if (warrantyRaw && /^\d{4}-\d{2}-\d{2}$/.test(warrantyRaw)) {
      item.warranty_expiry_date = warrantyRaw;
    } else if (warrantyRaw) {
      errors.push(`Row ${i + 1}: warranty_expiry_date "${warrantyRaw}" is not YYYY-MM-DD, ignored.`);
    }

    const qtyRaw = row['quantity']?.trim();
    if (qtyRaw) {
      const qty = parseInt(qtyRaw, 10);
      if (!isNaN(qty) && qty > 0) item.quantity = qty;
    }

    items.push(item);
  }

  return { items, skipped, errors };
}

// ─── JSON Parser ──────────────────────────────────────────────────────────────

function parseJson(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { items: [], skipped: 0, errors: ['Invalid JSON — could not parse.'] };
  }

  let arr: unknown[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)['items'])) {
    arr = (raw as Record<string, unknown>)['items'] as unknown[];
  } else {
    return { items: [], skipped: 0, errors: ['JSON must be an array or an object with an "items" array.'] };
  }

  const items: ParsedItem[] = [];
  const errors: string[] = [];
  let skipped = 0;

  arr.forEach((entry, idx) => {
    if (!entry || typeof entry !== 'object') {
      skipped++;
      errors.push(`Entry ${idx + 1}: skipped — not an object.`);
      return;
    }
    const r = entry as Record<string, unknown>;
    const name = typeof r['name'] === 'string' ? r['name'].trim() : '';
    if (!name) {
      skipped++;
      errors.push(`Entry ${idx + 1}: skipped — missing required field "name".`);
      return;
    }

    const item: ParsedItem = { name };

    if (typeof r['brand'] === 'string' && r['brand'].trim()) item.brand = r['brand'].trim();
    if (typeof r['model'] === 'string' && r['model'].trim()) item.model = r['model'].trim();
    if (typeof r['serial_number'] === 'string' && r['serial_number'].trim()) item.serial_number = r['serial_number'].trim();
    if (typeof r['notes'] === 'string' && r['notes'].trim()) item.notes = r['notes'].trim();
    if (typeof r['location'] === 'string' && r['location'].trim()) item.location = r['location'].trim();

    const condRaw = typeof r['condition'] === 'string' ? (r['condition'].trim().toLowerCase() as ItemCondition) : undefined;
    if (condRaw && VALID_CONDITIONS.includes(condRaw)) {
      item.condition = condRaw;
    } else if (condRaw) {
      errors.push(`Entry ${idx + 1}: unknown condition "${condRaw}", defaulting to "good".`);
      item.condition = 'good';
    }

    if (typeof r['purchase_price'] === 'number') {
      item.purchase_price = r['purchase_price'];
    } else if (typeof r['purchase_price'] === 'string') {
      const price = parseFloat(r['purchase_price'].replace(/[^0-9.-]/g, ''));
      if (!isNaN(price)) item.purchase_price = price;
    }

    const dateRaw = typeof r['purchase_date'] === 'string' ? r['purchase_date'].trim() : '';
    if (dateRaw && /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
      item.purchase_date = dateRaw;
    } else if (dateRaw) {
      errors.push(`Entry ${idx + 1}: purchase_date "${dateRaw}" is not YYYY-MM-DD, ignored.`);
    }

    const warrantyRaw = typeof r['warranty_expiry_date'] === 'string' ? r['warranty_expiry_date'].trim() : '';
    if (warrantyRaw && /^\d{4}-\d{2}-\d{2}$/.test(warrantyRaw)) {
      item.warranty_expiry_date = warrantyRaw;
    } else if (warrantyRaw) {
      errors.push(`Entry ${idx + 1}: warranty_expiry_date "${warrantyRaw}" is not YYYY-MM-DD, ignored.`);
    }

    if (typeof r['quantity'] === 'number' && r['quantity'] > 0) {
      item.quantity = Math.floor(r['quantity']);
    } else if (typeof r['quantity'] === 'string') {
      const qty = parseInt(r['quantity'], 10);
      if (!isNaN(qty) && qty > 0) item.quantity = qty;
    }

    items.push(item);
  });

  return { items, skipped, errors };
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type ImportFormat = 'csv' | 'json';
type Step = 'input' | 'preview' | 'done';

export default function ImportScreen() {
  const { activeWorkspace } = useWorkspaceContext();
  const colors = useColors();

  const [format, setFormat] = useState<ImportFormat>('csv');
  const [rawText, setRawText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  const handleParse = () => {
    const text = rawText.trim();
    if (!text) {
      Alert.alert('Empty Input', 'Paste your CSV or JSON data first.');
      return;
    }
    const result = format === 'csv' ? parseCsv(text) : parseJson(text);
    setParseResult(result);
    if (result.items.length === 0) {
      Alert.alert('No Valid Items', result.errors.length > 0 ? result.errors[0] : 'No importable items found.');
      return;
    }
    setStep('preview');
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.items.length === 0) return;
    if (!activeWorkspace) {
      Alert.alert('No Workspace', 'Select an active workspace before importing.');
      return;
    }

    setImporting(true);
    setProgress({ done: 0, total: parseResult.items.length });

    const BATCH_SIZE = 50;
    const batches: ParsedItem[][] = [];
    for (let i = 0; i < parseResult.items.length; i += BATCH_SIZE) {
      batches.push(parseResult.items.slice(i, i + BATCH_SIZE));
    }

    let totalInserted = 0;
    const insertErrors: string[] = [];

    for (let b = 0; b < batches.length; b++) {
      const batch = batches[b];
      const rows = batch.map(item => ({
        workspace_id: activeWorkspace.id,
        name: item.name,
        brand: item.brand ?? null,
        model: item.model ?? null,
        serial_number: item.serial_number ?? null,
        notes: item.notes ?? null,
        location: item.location ?? null,
        condition: item.condition ?? 'good',
        purchase_price: item.purchase_price ?? null,
        purchase_date: item.purchase_date ?? null,
        warranty_expiry_date: item.warranty_expiry_date ?? null,
        quantity: item.quantity ?? 1,
        unit: 'unit',
        currency: 'USD',
      }));

      try {
        const { data, error } = await supabase.from('items').insert(rows).select('id');
        if (error) throw error;
        totalInserted += (data ?? []).length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        insertErrors.push(`Batch ${b + 1}: ${msg}`);
      }

      setProgress({ done: Math.min((b + 1) * BATCH_SIZE, parseResult.items.length), total: parseResult.items.length });
    }

    setImporting(false);
    setImportedCount(totalInserted);
    setStep('done');

    if (insertErrors.length > 0) {
      Alert.alert(
        'Import Completed with Errors',
        `${totalInserted} items imported. ${insertErrors.length} batch(es) failed:\n${insertErrors.join('\n')}`
      );
    } else {
      Alert.alert('Import Complete', `${totalInserted} item${totalInserted !== 1 ? 's' : ''} successfully imported.`);
    }
  };

  const handleReset = () => {
    setStep('input');
    setRawText('');
    setParseResult(null);
    setProgress(null);
    setImportedCount(0);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Import Data' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 'input' && (
          <InputStep
            format={format}
            setFormat={setFormat}
            rawText={rawText}
            setRawText={setRawText}
            onParse={handleParse}
            colors={colors}
          />
        )}

        {step === 'preview' && parseResult && (
          <PreviewStep
            result={parseResult}
            importing={importing}
            progress={progress}
            onImport={handleImport}
            onBack={handleReset}
            colors={colors}
          />
        )}

        {step === 'done' && (
          <DoneStep importedCount={importedCount} onReset={handleReset} colors={colors} />
        )}
      </ScrollView>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FormatTab({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.formatTab,
        { borderColor: colors.border, backgroundColor: colors.surface },
        active && { borderColor: colors.primary, backgroundColor: colors.primary + '12' },
      ]}
    >
      <Text
        style={[
          styles.formatTabText,
          { color: colors.textSecondary },
          active && { color: colors.primary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function InputStep({
  format,
  setFormat,
  rawText,
  setRawText,
  onParse,
  colors,
}: {
  format: ImportFormat;
  setFormat: (f: ImportFormat) => void;
  rawText: string;
  setRawText: (t: string) => void;
  onParse: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const hint =
    format === 'csv'
      ? 'name,brand,model,condition,purchase_price,purchase_date,serial_number,notes,location,warranty_expiry_date,quantity\n"Laptop","Dell","XPS 15","good",1299.99,"2024-01-15","SN123","Work machine","Office",,1'
      : '[\n  {\n    "name": "Laptop",\n    "brand": "Dell",\n    "condition": "good",\n    "purchase_price": 1299.99,\n    "purchase_date": "2024-01-15",\n    "quantity": 1\n  }\n]';

  return (
    <View>
      <Text style={[styles.description, { color: colors.textSecondary }]}>
        Paste your CSV or JSON data below to import items into your inventory.
      </Text>

      <View style={styles.sectionHeader}>
        <Ionicons name="document-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Format</Text>
      </View>
      <View style={styles.formatRow}>
        <FormatTab label="CSV" active={format === 'csv'} onPress={() => setFormat('csv')} colors={colors} />
        <FormatTab label="JSON" active={format === 'json'} onPress={() => setFormat('json')} colors={colors} />
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons name="code-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Paste Data</Text>
      </View>
      <Card variant="bordered" padding={0} style={styles.textAreaCard}>
        <TextInput
          style={[styles.textArea, { color: colors.textPrimary, backgroundColor: colors.surface }]}
          multiline
          numberOfLines={10}
          value={rawText}
          onChangeText={setRawText}
          placeholder={hint}
          placeholderTextColor={colors.textSecondary + '80'}
          autoCapitalize="none"
          autoCorrect={false}
          textAlignVertical="top"
        />
      </Card>

      <View style={[styles.hintBox, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} style={{ marginRight: 6, marginTop: 1 }} />
        <Text style={[styles.hintText, { color: colors.primary }]}>
          {format === 'csv'
            ? 'First row must be headers. Required: name. Dates must be YYYY-MM-DD.'
            : 'Accepts an array [{...}] or {items:[...]}. Required field: name. Dates must be YYYY-MM-DD.'}
        </Text>
      </View>

      <Button
        title="Parse & Preview"
        onPress={onParse}
        fullWidth
        size="lg"
        icon="search-outline"
        style={styles.actionBtn}
      />
    </View>
  );
}

function PreviewStep({
  result,
  importing,
  progress,
  onImport,
  onBack,
  colors,
}: {
  result: ParseResult;
  importing: boolean;
  progress: { done: number; total: number } | null;
  onImport: () => void;
  onBack: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const preview = result.items.slice(0, 3);

  return (
    <View>
      <View style={[styles.summaryBox, { backgroundColor: colors.success + '14', borderColor: colors.success + '40' }]}>
        <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} style={{ marginRight: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.summaryTitle, { color: colors.success }]}>
            {result.items.length} item{result.items.length !== 1 ? 's' : ''} ready to import
          </Text>
          {result.skipped > 0 && (
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              {result.skipped} row{result.skipped !== 1 ? 's' : ''} skipped (missing name)
            </Text>
          )}
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Ionicons name="list-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preview (first 3)</Text>
      </View>
      <Card variant="bordered" padding={0} style={styles.card}>
        {preview.map((item, idx) => (
          <View
            key={idx}
            style={[
              styles.previewRow,
              { borderBottomColor: colors.divider },
              idx < preview.length - 1 && styles.previewRowBorder,
            ]}
          >
            <Ionicons name="cube-outline" size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewName, { color: colors.textPrimary }]}>{item.name}</Text>
              {(item.brand || item.model) && (
                <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
                  {[item.brand, item.model].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
            {item.purchase_price != null && (
              <Text style={[styles.previewPrice, { color: colors.textSecondary }]}>
                ${item.purchase_price.toFixed(2)}
              </Text>
            )}
          </View>
        ))}
        {result.items.length > 3 && (
          <Text style={[styles.moreItems, { color: colors.textSecondary }]}>
            +{result.items.length - 3} more item{result.items.length - 3 !== 1 ? 's' : ''}
          </Text>
        )}
      </Card>

      {result.errors.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Ionicons name="warning-outline" size={18} color={colors.warning ?? colors.error} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {result.errors.length} Warning{result.errors.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <Card variant="bordered" padding={12} style={{ ...styles.card, borderColor: (colors.warning ?? colors.error) + '50' }}>
            <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled showsVerticalScrollIndicator>
              {result.errors.map((err, idx) => (
                <Text key={idx} style={[styles.errorLine, { color: colors.error }]}>
                  {err}
                </Text>
              ))}
            </ScrollView>
          </Card>
        </>
      )}

      {importing && progress && (
        <View style={[styles.progressBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ActivityIndicator color={colors.primary} size="small" style={{ marginRight: 10 }} />
          <Text style={[styles.progressText, { color: colors.textPrimary }]}>
            Importing {progress.done} / {progress.total}...
          </Text>
        </View>
      )}

      <Button
        title={importing ? 'Importing...' : `Import ${result.items.length} item${result.items.length !== 1 ? 's' : ''}`}
        onPress={onImport}
        loading={importing}
        fullWidth
        size="lg"
        icon="cloud-upload-outline"
        style={styles.actionBtn}
      />
      <Button
        title="Back"
        onPress={onBack}
        variant="ghost"
        fullWidth
        size="md"
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

function DoneStep({
  importedCount,
  onReset,
  colors,
}: {
  importedCount: number;
  onReset: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.doneContainer}>
      <View style={[styles.doneIconCircle, { backgroundColor: colors.success + '18' }]}>
        <Ionicons name="checkmark-circle" size={56} color={colors.success} />
      </View>
      <Text style={[styles.doneTitle, { color: colors.textPrimary }]}>Import Complete</Text>
      <Text style={[styles.doneSubtitle, { color: colors.textSecondary }]}>
        {importedCount} item{importedCount !== 1 ? 's' : ''} added to your inventory.
      </Text>
      <Button
        title="Import More"
        onPress={onReset}
        variant="outline"
        size="lg"
        style={{ marginTop: 32, alignSelf: 'stretch' }}
        fullWidth
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  description: { fontSize: 14, marginBottom: 20, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 8 },
  sectionIcon: { marginRight: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  formatRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  formatTab: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  formatTabText: { fontSize: 15, fontWeight: '600' },
  textAreaCard: { marginBottom: 12 },
  textArea: {
    padding: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    minHeight: 180,
    borderRadius: 8,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 20,
  },
  hintText: { flex: 1, fontSize: 12, lineHeight: 17 },
  actionBtn: { marginTop: 4 },
  summaryBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  summaryTitle: { fontSize: 15, fontWeight: '700' },
  summarySubtitle: { fontSize: 13, marginTop: 2 },
  card: { marginBottom: 16 },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  previewRowBorder: { borderBottomWidth: 1 },
  previewName: { fontSize: 14, fontWeight: '600' },
  previewSub: { fontSize: 12, marginTop: 2 },
  previewPrice: { fontSize: 13, fontWeight: '500', marginLeft: 8 },
  moreItems: { fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  errorLine: { fontSize: 12, lineHeight: 18, marginBottom: 2 },
  progressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  progressText: { fontSize: 14 },
  doneContainer: { alignItems: 'center', paddingTop: 40 },
  doneIconCircle: { borderRadius: 50, padding: 16, marginBottom: 16 },
  doneTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  doneSubtitle: { fontSize: 15, textAlign: 'center' },
});
