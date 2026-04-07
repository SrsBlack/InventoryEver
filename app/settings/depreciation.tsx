import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { Card } from '../../components/ui/Card';
import { useColors } from '../../hooks/useColors';
import {
  straightLineDepreciation,
  decliningBalanceDepreciation,
  sumOfYearsDepreciation,
  suggestUsefulLife,
  formatCurrencyAmount,
  type DepreciationMethod,
  type DepreciationResult,
} from '../../lib/depreciation';
import type { Item } from '../../types';

const METHODS: { value: DepreciationMethod; label: string; desc: string }[] = [
  { value: 'straight-line', label: 'Straight-Line', desc: 'Equal amount each year' },
  { value: 'declining-balance', label: 'Declining Balance', desc: 'Faster in early years (2x)' },
  { value: 'sum-of-years', label: 'Sum of Years', desc: 'Accelerated front-loading' },
];

function computeForItem(item: Item, method: DepreciationMethod, usefulLife: number): DepreciationResult | null {
  const value = item.current_value ?? item.purchase_price;
  if (!value || !item.purchase_date) return null;
  const date = new Date(item.purchase_date);
  if (isNaN(date.getTime())) return null;
  switch (method) {
    case 'straight-line': return straightLineDepreciation(value, date, usefulLife);
    case 'declining-balance': return decliningBalanceDepreciation(value, date, usefulLife);
    case 'sum-of-years': return sumOfYearsDepreciation(value, date, usefulLife);
  }
}

export default function DepreciationScreen() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { items } = useItems(activeWorkspace?.id);
  const colors = useColors();
  const [method, setMethod] = useState<DepreciationMethod>('straight-line');
  const [usefulLifeInput, setUsefulLifeInput] = useState('5');

  const usefulLife = Math.max(1, Math.min(50, parseInt(usefulLifeInput) || 5));

  // Only items with a purchase value and purchase date
  const eligibleItems = useMemo(
    () => items.filter(i => (i.current_value ?? i.purchase_price) && i.purchase_date),
    [items],
  );

  const results = useMemo(
    () =>
      eligibleItems.map(item => ({
        item,
        result: computeForItem(item, method, usefulLife),
        suggestedLife: suggestUsefulLife(item.category?.name),
      })),
    [eligibleItems, method, usefulLife],
  );

  const portfolioOriginal = results.reduce((s, r) => s + (r.result?.originalValue ?? 0), 0);
  const portfolioCurrent = results.reduce((s, r) => s + (r.result?.currentEstimatedValue ?? 0), 0);
  const portfolioLost = portfolioOriginal - portfolioCurrent;
  const portfolioPercent = portfolioOriginal > 0 ? (portfolioLost / portfolioOriginal) * 100 : 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Depreciation', headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.textPrimary }} />
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Portfolio Summary */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>PORTFOLIO SUMMARY</Text>
          </View>
          <View style={styles.summaryRow}>
            <SummaryCard label="Original Value" value={formatCurrencyAmount(portfolioOriginal)} borderColor={colors.primary} />
            <SummaryCard label="Current Value" value={formatCurrencyAmount(portfolioCurrent)} borderColor={colors.accent} />
          </View>
          <Card variant="bordered" style={styles.lossCard}>
            <View style={styles.lossRow}>
              <View>
                <Text style={[styles.lossLabel, { color: colors.textSecondary }]}>Total Depreciated</Text>
                <Text style={[styles.lossValue, { color: colors.textPrimary }]}>{formatCurrencyAmount(portfolioLost)}</Text>
              </View>
              <View style={[styles.lossBadge, { backgroundColor: portfolioPercent > 30 ? colors.errorLight : colors.warningLight }]}>
                <Text style={[styles.lossBadgeText, { color: portfolioPercent > 30 ? colors.error : colors.warning }]}>
                  -{portfolioPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
            {/* Depreciation bar */}
            <View style={[styles.lossBarTrack, { backgroundColor: colors.gray200 }]}>
              <View style={[styles.lossBar, { width: `${Math.min(portfolioPercent, 100)}%` as any, backgroundColor: portfolioPercent > 50 ? colors.error : colors.warning }]} />
            </View>
          </Card>

          {/* Method Picker */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DEPRECIATION METHOD</Text>
          </View>
          {METHODS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[
                styles.methodRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                method === m.value && { borderColor: colors.primary, backgroundColor: colors.primary + '0D' },
              ]}
              onPress={() => setMethod(m.value)}
              activeOpacity={0.8}
            >
              <View style={[styles.methodRadio, { borderColor: colors.border }, method === m.value && { borderColor: colors.primary }]}>
                {method === m.value && <View style={[styles.methodRadioDot, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.methodInfo}>
                <Text style={[styles.methodLabel, { color: colors.textPrimary }]}>{m.label}</Text>
                <Text style={[styles.methodDesc, { color: colors.textTertiary }]}>{m.desc}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {/* Useful Life */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>DEFAULT USEFUL LIFE</Text>
          </View>
          <View style={styles.lifeRow}>
            <TextInput
              style={[styles.lifeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={usefulLifeInput}
              onChangeText={setUsefulLifeInput}
              keyboardType="number-pad"
              maxLength={2}
            />
            <Text style={[styles.lifeUnit, { color: colors.textSecondary }]}>years</Text>
            <Text style={[styles.lifeHint, { color: colors.textTertiary }]}>(per item override via category suggestion)</Text>
          </View>

          {/* Item List */}
          {eligibleItems.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calculator-outline" size={40} color={colors.gray400} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Add purchase prices and dates to items to see depreciation.</Text>
            </View>
          ) : (
            <>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>BY ITEM ({eligibleItems.length})</Text>
              </View>
              {results.map(({ item, result, suggestedLife }) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => router.push(`/item/${item.id}` as `/${string}`)}
                  activeOpacity={0.8}
                >
                  <View style={styles.itemCardHeader}>
                    <View style={[styles.itemEmoji, { backgroundColor: colors.gray200 }]}>
                      {item.category?.icon_emoji ? (
                        <Text>{item.category.icon_emoji}</Text>
                      ) : (
                        <Ionicons name="cube-outline" size={16} color={colors.gray500} />
                      )}
                    </View>
                    <View style={styles.itemCardInfo}>
                      <Text style={[styles.itemCardName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                      <Text style={[styles.itemCardMeta, { color: colors.textTertiary }]}>
                        {item.category?.name ?? 'Uncategorized'} · suggested {suggestedLife}yr life
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.gray500} />
                  </View>
                  {result ? (
                    <View style={styles.itemCardStats}>
                      <StatPill label="Original" value={formatCurrencyAmount(result.originalValue, item.currency)} />
                      <StatPill label="Now" value={formatCurrencyAmount(result.currentEstimatedValue, item.currency)} accent={colors.accent} />
                      <StatPill label="Lost" value={`-${result.depreciationPercent.toFixed(0)}%`} accent={colors.warning} />
                      <StatPill label="Age" value={`${result.ageYears.toFixed(1)}yr`} />
                    </View>
                  ) : (
                    <Text style={[styles.noDataText, { color: colors.textTertiary }]}>Missing purchase date or price</Text>
                  )}
                  {result && result.depreciationPercent > 0 && (
                    <View style={[styles.miniBarTrack, { backgroundColor: colors.gray200 }]}>
                      <View style={[
                        styles.miniBar,
                        {
                          width: `${Math.min(result.depreciationPercent, 100)}%` as any,
                          backgroundColor: result.depreciationPercent > 70 ? colors.error :
                            result.depreciationPercent > 40 ? colors.warning : colors.primary,
                        },
                      ]} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function SummaryCard({ label, value, borderColor }: { label: string; value: string; borderColor: string }) {
  const colors = useColors();
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: borderColor }]}>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statPill, { backgroundColor: colors.background }]}>
      <Text style={[styles.statPillValue, { color: accent ?? colors.textSecondary }]}>{value}</Text>
      <Text style={[styles.statPillLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  sectionHeader: { marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  summaryCard: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
  },
  summaryValue: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  lossCard: { marginBottom: 4 },
  lossRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  lossLabel: { fontSize: 11, marginBottom: 2 },
  lossValue: { fontSize: 18, fontWeight: '800' },
  lossBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  lossBadgeText: { fontSize: 14, fontWeight: '800' },
  lossBarTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  lossBar: { height: '100%', borderRadius: 3 },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  methodRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  methodRadioDot: { width: 10, height: 10, borderRadius: 5 },
  methodInfo: { flex: 1 },
  methodLabel: { fontSize: 14, fontWeight: '600' },
  methodDesc: { fontSize: 12, marginTop: 1 },
  lifeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  lifeInput: {
    width: 60,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  lifeUnit: { fontSize: 15, fontWeight: '500' },
  lifeHint: { flex: 1, fontSize: 11 },
  empty: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center', paddingHorizontal: 20 },
  itemCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  itemCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemEmoji: { width: 32, height: 32, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  itemCardInfo: { flex: 1 },
  itemCardName: { fontSize: 14, fontWeight: '600' },
  itemCardMeta: { fontSize: 11, marginTop: 1 },
  itemCardStats: { flexDirection: 'row', gap: 6 },
  statPill: { flex: 1, borderRadius: 6, padding: 8, alignItems: 'center' },
  statPillValue: { fontSize: 12, fontWeight: '700' },
  statPillLabel: { fontSize: 9, marginTop: 2, letterSpacing: 0.5 },
  noDataText: { fontSize: 12, fontStyle: 'italic' },
  miniBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  miniBar: { height: '100%', borderRadius: 2 },
});
