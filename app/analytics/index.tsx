import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { useLending } from '../../hooks/useLending';
import { useMaintenance } from '../../hooks/useMaintenance';
import { useColors } from '../../hooks/useColors';
import { Card } from '../../components/ui/Card';
import { Spinner } from '../../components/ui/Spinner';
import { ValueByCategory } from '../../components/dashboard/ValueByCategory';
import { ConditionBreakdown } from '../../components/dashboard/ConditionBreakdown';
import { ValueByLocation } from '../../components/analytics/ValueByLocation';
import { TopValueItems } from '../../components/analytics/TopValueItems';
import { ItemsOverTime } from '../../components/analytics/ItemsOverTime';
import {
  filterByPeriod,
  computeSummary,
  computeValueByCategory,
  computeValueByLocation,
  computeTopValueItems,
  computeItemsOverTime,
  computeInsights,
  type TimePeriodFilter,
} from '../../lib/analyticsData';

const PERIODS: { label: string; value: TimePeriodFilter }[] = [
  { label: 'All Time', value: 'all' },
  { label: 'This Year', value: 'year' },
  { label: 'Last 30 Days', value: 'month30' },
];

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (value >= 1_000) return '$' + (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '$' + value.toFixed(0);
}

export default function AnalyticsScreen() {
  const router = useRouter();
  const colors = useColors();
  const { activeWorkspace } = useWorkspaceContext();
  const { items, loading, hasMore, loadMore, fetchItems } = useItems(activeWorkspace?.id);
  const { overdue } = useLending(activeWorkspace?.id);
  const { upcoming } = useMaintenance(activeWorkspace?.id);
  const [period, setPeriod] = useState<TimePeriodFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Exhaust pagination to get all items for analytics
  useEffect(() => {
    if (hasMore && !loading) {
      loadMore();
    }
  }, [hasMore, loading]);

  const isLoadingAll = loading || hasMore;

  // Computed analytics — only runs when all items are loaded
  const filteredItems = useMemo(
    () => filterByPeriod(items, period),
    [items, period],
  );

  const summary = useMemo(() => computeSummary(filteredItems), [filteredItems]);
  const byCategory = useMemo(() => computeValueByCategory(filteredItems), [filteredItems]);
  const byLocation = useMemo(() => computeValueByLocation(filteredItems).slice(0, 5), [filteredItems]);
  const topItems = useMemo(() => computeTopValueItems(filteredItems), [filteredItems]);
  const weekBuckets = useMemo(() => computeItemsOverTime(filteredItems), [filteredItems]);
  const insights = useMemo(() => computeInsights(filteredItems), [filteredItems]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchItems(true);
    setRefreshing(false);
  };

  if (isLoadingAll) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>ANALYTICS</Text>
          <View style={styles.headerRight} />
        </View>
        <Spinner label="Loading analytics..." />
      </SafeAreaView>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>ANALYTICS</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.gray400} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No Data Yet</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Add items to your inventory to see analytics</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>ANALYTICS</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Period Filter */}
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

        {/* Summary Cards */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>OVERVIEW</Text>
        </View>
        <View style={styles.summaryGrid}>
          <SummaryCard
            label="Total Items"
            value={String(summary.totalItems)}
            borderColor={colors.primary}
            colors={colors}
          />
          <SummaryCard
            label="Portfolio Value"
            value={formatCurrency(summary.totalPortfolioValue)}
            borderColor={colors.warning}
            colors={colors}
          />
          <SummaryCard
            label="Avg Item Value"
            value={formatCurrency(summary.averageItemValue)}
            borderColor={colors.accent}
            colors={colors}
          />
          <SummaryCard
            label="Active Warranties"
            value={String(summary.activeWarrantyCount)}
            borderColor={colors.success}
            colors={colors}
          />
        </View>

        {/* Value Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>VALUE BREAKDOWN</Text>
        </View>

        <Card variant="bordered" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>By Category</Text>
          <ValueByCategory items={filteredItems} />
        </Card>

        <Card variant="bordered" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>By Location</Text>
          <ValueByLocation data={byLocation} />
        </Card>

        {/* Condition & Activity */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>CONDITION & ACTIVITY</Text>
        </View>

        <Card variant="bordered" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>Condition Breakdown</Text>
          <ConditionBreakdown items={filteredItems} />
        </Card>

        <Card variant="bordered" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>Items Added (8 Weeks)</Text>
          <ItemsOverTime data={weekBuckets} />
        </Card>

        <Card variant="bordered" style={styles.chartCard}>
          <Text style={[styles.chartTitle, { color: colors.textSecondary }]}>Top 5 Most Valuable</Text>
          <TopValueItems items={topItems} />
        </Card>

        {/* Insights */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>INSIGHTS</Text>
        </View>

        <Card variant="bordered" padding={0}>
          <InsightRow
            icon="folder"
            iconColor={colors.primary}
            label="Most common category"
            value={insights.mostCommonCategory ?? '—'}
            isLast={false}
            colors={colors}
          />
          <InsightRow
            icon="trophy"
            iconColor={colors.warning}
            label="Highest-value item"
            value={insights.highestValueItem ? insights.highestValueItem.name : '—'}
            isLast={false}
            colors={colors}
          />
          <InsightRow
            icon="help-circle"
            iconColor={insights.uncategorizedCount > 0 ? colors.gray500 : colors.accent}
            label="Uncategorized items"
            value={String(insights.uncategorizedCount)}
            valueColor={insights.uncategorizedCount > 0 ? colors.warning : colors.accent}
            isLast={false}
            colors={colors}
          />
          <InsightRow
            icon="location-outline"
            iconColor={insights.unlocatedCount > 0 ? colors.gray500 : colors.accent}
            label="Items without location"
            value={String(insights.unlocatedCount)}
            valueColor={insights.unlocatedCount > 0 ? colors.warning : colors.accent}
            isLast={false}
            colors={colors}
          />
          <InsightRow
            icon="alert-circle"
            iconColor={overdue.length > 0 ? colors.error : colors.accent}
            label="Overdue lending"
            value={String(overdue.length)}
            valueColor={overdue.length > 0 ? colors.error : colors.accent}
            isLast={false}
            colors={colors}
          />
          <InsightRow
            icon="build"
            iconColor={upcoming.length > 0 ? colors.warning : colors.accent}
            label="Upcoming maintenance"
            value={String(upcoming.length)}
            valueColor={upcoming.length > 0 ? colors.warning : colors.accent}
            isLast
            colors={colors}
          />
        </Card>

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, { borderColor: colors.primary + '60', backgroundColor: colors.surface }]}
          onPress={() => router.push('/analytics/reports')}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={18} color={colors.primary} />
          <Text style={[styles.exportBtnText, { color: colors.primary }]}>Export Report</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.gray500} />
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, borderColor, colors }: { label: string; value: string; borderColor: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: borderColor }]}>
      <Text style={[styles.summaryValue, { color: colors.textPrimary }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.textTertiary }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

function InsightRow({
  icon,
  iconColor,
  label,
  value,
  valueColor,
  isLast,
  colors,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
  valueColor?: string;
  isLast: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.insightRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <Ionicons name={icon as any} size={16} color={iconColor} style={styles.insightIcon} />
      <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.insightValue, { color: valueColor ?? colors.textPrimary }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  headerRight: {
    width: 32,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Period filter
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodChipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Section header
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  // Summary grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    width: '48%',
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  // Chart cards
  chartCard: {
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  // Insight rows
  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  insightIcon: {
    marginRight: 10,
  },
  insightLabel: {
    flex: 1,
    fontSize: 13,
  },
  insightValue: {
    fontSize: 13,
    fontWeight: '700',
    maxWidth: 140,
    textAlign: 'right',
  },
  // Export button
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  exportBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomPad: {
    height: 40,
  },
});
