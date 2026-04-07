import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { useColors } from '../../hooks/useColors';
import {
  printLabels,
  shareLabelsAsPdf,
  qrCodeUrl,
  buildItemDeepLink,
  DEFAULT_LABEL_OPTIONS,
  type LabelTemplate,
  type LabelOptions,
} from '../../lib/labels';
import type { Item } from '../../types';

const TEMPLATES: { id: LabelTemplate; label: string; icon: string; desc: string }[] = [
  { id: 'sticker', label: 'Small Sticker', icon: '🏷️', desc: '160 × 72px — compact QR + name' },
  { id: 'full',    label: 'Full Label',    icon: '📋', desc: '240px card — photo, details, QR' },
  { id: 'shelf',   label: 'Shelf Tag',     icon: '📂', desc: '300 × 60px — wide horizontal tag' },
];

const COPIES_OPTIONS = [1, 2, 3, 5, 10];

export default function PrintLabelsScreen() {
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { items } = useItems(activeWorkspace?.id);
  const colors = useColors();

  const [targetItems, setTargetItems] = useState<Item[]>([]);
  const [opts, setOpts] = useState<LabelOptions>(DEFAULT_LABEL_OPTIONS);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [tab, setTab] = useState<'options' | 'preview'>('options');

  // Resolve items from ids param
  useEffect(() => {
    if (!ids || items.length === 0) return;
    const idList = decodeURIComponent(ids).split(',').filter(Boolean);
    const resolved = idList.map(id => items.find(i => i.id === id)).filter(Boolean) as Item[];
    setTargetItems(resolved);
  }, [ids, items]);

  const handlePrint = useCallback(async () => {
    if (targetItems.length === 0) return;
    setPrinting(true);
    try {
      await printLabels(targetItems, opts);
    } catch (err) {
      Alert.alert('Print failed', err instanceof Error ? err.message : 'Could not open print dialog.');
    } finally {
      setPrinting(false);
    }
  }, [targetItems, opts]);

  const handleShare = useCallback(async () => {
    if (targetItems.length === 0) return;
    setSharing(true);
    try {
      await shareLabelsAsPdf(targetItems, opts);
    } catch (err) {
      Alert.alert('Share failed', err instanceof Error ? err.message : 'Could not generate PDF.');
    } finally {
      setSharing(false);
    }
  }, [targetItems, opts]);

  const updateOpt = <K extends keyof LabelOptions>(key: K, value: LabelOptions[K]) =>
    setOpts(prev => ({ ...prev, [key]: value }));

  const isBusy = printing || sharing;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>PRINT LABELS</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {targetItems.length} item{targetItems.length !== 1 ? 's' : ''}
            {opts.copies > 1 ? ` × ${opts.copies} copies = ${targetItems.length * opts.copies} labels` : ''}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        {(['options', 'preview'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomWidth: 2, borderBottomColor: colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, tab === t && { color: colors.primary }]}>
              {t === 'options' ? 'OPTIONS' : 'PREVIEW'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'options' ? (
        <ScrollView contentContainerStyle={styles.form}>

          {/* Items summary */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>ITEMS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemChips}>
              {targetItems.map(item => (
                <View key={item.id} style={[styles.itemChip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {item.main_image_url
                    ? <Image source={{ uri: item.main_image_url }} style={styles.chipThumb} />
                    : <View style={[styles.chipThumbPlaceholder, { backgroundColor: colors.border }]}><Text>📦</Text></View>}
                  <Text style={[styles.chipName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Template */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TEMPLATE</Text>
            {TEMPLATES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.templateRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  opts.template === t.id && { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
                ]}
                onPress={() => updateOpt('template', t.id)}
              >
                <Text style={styles.templateEmoji}>{t.icon}</Text>
                <View style={styles.templateInfo}>
                  <Text style={[styles.templateLabel, { color: colors.textPrimary }]}>{t.label}</Text>
                  <Text style={[styles.templateDesc, { color: colors.textSecondary }]}>{t.desc}</Text>
                </View>
                {opts.template === t.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Copies */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>COPIES PER ITEM</Text>
            <View style={styles.copiesRow}>
              {COPIES_OPTIONS.map(n => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.copyChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    opts.copies === n && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => updateOpt('copies', n)}
                >
                  <Text style={[styles.copyChipText, { color: colors.textSecondary }, opts.copies === n && { color: '#fff' }]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Field toggles */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>INCLUDE FIELDS</Text>
            {([
              { key: 'showPrice',    label: 'Purchase Price' },
              { key: 'showLocation', label: 'Location' },
              { key: 'showSerial',   label: 'Serial Number' },
            ] as { key: keyof LabelOptions; label: string }[]).map(row => (
              <View key={row.key} style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>{row.label}</Text>
                <Switch
                  value={opts[row.key] as boolean}
                  onValueChange={v => updateOpt(row.key, v as any)}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            ))}
          </View>

          {/* QR info */}
          {targetItems.length === 1 && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>QR CODE PREVIEW</Text>
              <View style={[styles.qrPreviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Image
                  source={{ uri: qrCodeUrl(buildItemDeepLink(targetItems[0].id), 120) }}
                  style={styles.qrPreviewImg}
                />
                <View style={styles.qrPreviewInfo}>
                  <Text style={[styles.qrPreviewName, { color: colors.textPrimary }]}>{targetItems[0].name}</Text>
                  <Text style={[styles.qrPreviewMeta, { color: colors.textSecondary }]}>Scan to open in InventoryEver</Text>
                  <Text style={[styles.qrPreviewLink, { color: colors.primary }]} numberOfLines={1}>
                    {buildItemDeepLink(targetItems[0].id)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      ) : (
        /* Preview tab — native card mock-ups */
        <ScrollView contentContainerStyle={styles.previewScroll}>
          {targetItems.length === 0 ? (
            <View style={styles.previewLoading}>
              <ActivityIndicator color={colors.primary} size="large" />
            </View>
          ) : (
            targetItems.flatMap((item, itemIdx) =>
              Array.from({ length: opts.copies }, (_, copyIdx) => (
                <PreviewCard
                  key={`${item.id}-${copyIdx}`}
                  item={item}
                  opts={opts}
                  index={itemIdx * opts.copies + copyIdx}
                />
              ))
            )
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Bottom action bar */}
      <View style={[styles.actionBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.shareBtn, { backgroundColor: colors.surface, borderColor: colors.primary }, (isBusy || targetItems.length === 0) && { opacity: 0.5 }]}
          onPress={handleShare}
          disabled={isBusy || targetItems.length === 0}
        >
          {sharing ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="share-outline" size={18} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Save PDF</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary }, (isBusy || targetItems.length === 0) && { opacity: 0.5 }]}
          onPress={handlePrint}
          disabled={isBusy || targetItems.length === 0}
        >
          {printing ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="print" size={18} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Print</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Preview Card ─────────────────────────────────────────────────────────────

function PreviewCard({ item, opts, index }: { item: Item; opts: LabelOptions; index: number }) {
  const TEMPLATE_NAMES: Record<LabelTemplate, string> = {
    sticker: 'Small Sticker',
    full: 'Full Label',
    shelf: 'Shelf Tag',
  };

  return (
    <View style={previewStyles.card}>
      <Text style={previewStyles.badge}>
        {TEMPLATE_NAMES[opts.template]} #{index + 1}
      </Text>
      <View style={previewStyles.row}>
        {/* Thumbnail */}
        {item.main_image_url ? (
          <Image source={{ uri: item.main_image_url }} style={previewStyles.thumb} />
        ) : (
          <View style={previewStyles.thumbPlaceholder}>
            <Text style={{ fontSize: 22 }}>📦</Text>
          </View>
        )}

        {/* Info */}
        <View style={previewStyles.info}>
          <Text style={previewStyles.name} numberOfLines={2}>{item.name}</Text>
          {(item.brand || item.model) && (
            <Text style={previewStyles.sub} numberOfLines={1}>
              {[item.brand, item.model].filter(Boolean).join(' · ')}
            </Text>
          )}
          {opts.showPrice && item.purchase_price && (
            <Text style={previewStyles.price}>
              {new Intl.NumberFormat('en-US', { style: 'currency', currency: item.currency || 'USD' }).format(item.purchase_price)}
            </Text>
          )}
          {opts.showLocation && (item.location_data?.full_path || item.location) && (
            <Text style={previewStyles.meta} numberOfLines={1}>
              📍 {item.location_data?.full_path ?? item.location}
            </Text>
          )}
          {opts.showSerial && item.serial_number && (
            <Text style={previewStyles.meta}>SN: {item.serial_number}</Text>
          )}
        </View>

        {/* QR Code */}
        <Image
          source={{ uri: qrCodeUrl(buildItemDeepLink(item.id), 80) }}
          style={previewStyles.qr}
        />
      </View>
    </View>
  );
}

// previewStyles intentionally use hardcoded light values — print labels always render on white paper
const previewStyles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 8, padding: 12, width: '100%',
    borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10,
  },
  badge: { fontSize: 9, fontWeight: '700', color: '#9CA3AF', marginBottom: 8, letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 6 },
  thumbPlaceholder: {
    width: 56, height: 56, borderRadius: 6, backgroundColor: '#F3F4F6',
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 13, fontWeight: '700', color: '#111827' },
  sub: { fontSize: 11, color: '#6B7280' },
  price: { fontSize: 12, fontWeight: '700', color: '#10B981' },
  meta: { fontSize: 10, color: '#9CA3AF' },
  qr: { width: 56, height: 56, borderRadius: 4 },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8, width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  headerSub: { fontSize: 11, marginTop: 1 },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabText: { fontSize: 12, fontWeight: '600', letterSpacing: 1 },

  form: { padding: 16, gap: 20, paddingBottom: 24 },

  section: { gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  itemChips: { flexGrow: 0 },
  itemChip: {
    alignItems: 'center', gap: 4, marginRight: 10,
    borderRadius: 8, padding: 8,
    borderWidth: 1, width: 72,
  },
  chipThumb: { width: 40, height: 40, borderRadius: 6 },
  chipThumbPlaceholder: {
    width: 40, height: 40, borderRadius: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  chipName: { fontSize: 10, textAlign: 'center', width: 56 },

  templateRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 8, padding: 12,
    borderWidth: 1,
  },
  templateEmoji: { fontSize: 22 },
  templateInfo: { flex: 1 },
  templateLabel: { fontSize: 14, fontWeight: '600' },
  templateDesc: { fontSize: 11, marginTop: 2 },

  copiesRow: { flexDirection: 'row', gap: 8 },
  copyChip: {
    width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  copyChipText: { fontSize: 15, fontWeight: '700' },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 14 },

  qrPreviewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderRadius: 8, padding: 14,
    borderWidth: 1,
  },
  qrPreviewImg: { width: 80, height: 80, borderRadius: 6 },
  qrPreviewInfo: { flex: 1, gap: 4 },
  qrPreviewName: { fontSize: 15, fontWeight: '700' },
  qrPreviewMeta: { fontSize: 11 },
  qrPreviewLink: { fontSize: 10 },

  previewScroll: { padding: 16, gap: 12, alignItems: 'center' },
  previewLoading: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },

  actionBar: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 8, paddingVertical: 13,
  },
  shareBtn: { borderWidth: 1 },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
});
