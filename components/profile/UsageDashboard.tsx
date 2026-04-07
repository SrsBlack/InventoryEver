import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../ui/Card';
import { useColors } from '../../hooks/useColors';
import type { SubscriptionTier, TierLimits } from '../../types';

interface UsageDashboardProps {
  tier: SubscriptionTier;
  usage: {
    items_count: number;
    ai_requests: number;
    storage_mb?: number;
    workspaces_count?: number;
  };
  limits: TierLimits;
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const colors = useColors();
  const percentage = Math.min((value / max) * 100, 100);
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.gray100 }]}>
      <View
        style={[styles.progressFill, { width: `${percentage}%` as `${number}%`, backgroundColor: color }]}
      />
    </View>
  );
}

interface MetricRowProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  max: number;
  formatValue?: (n: number) => string;
  formatMax?: (n: number) => string;
}

function MetricRow({ iconName, label, value, max, formatValue, formatMax }: MetricRowProps) {
  const colors = useColors();
  const color = getProgressColor(value, max, colors);
  const isNearLimit = value / max >= 0.8;
  const valueLabel = formatValue ? formatValue(value) : value.toLocaleString();
  const maxLabel = formatMax ? formatMax(max) : max.toLocaleString();

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricHeader}>
        <View style={styles.metricLeft}>
          <Ionicons name={iconName} size={16} color={colors.textSecondary} style={styles.metricIcon} />
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
        <Text style={[styles.metricCount, { color }]}>
          {valueLabel} / {maxLabel}
        </Text>
      </View>
      <ProgressBar value={value} max={max} color={color} />
      {isNearLimit && (
        <Text style={[styles.warningText, { color: colors.error }]}>Upgrade to get more</Text>
      )}
    </View>
  );
}

function getProgressColor(value: number, max: number, colors: ReturnType<typeof useColors>): string {
  const ratio = value / max;
  if (ratio < 0.5) return colors.success;
  if (ratio < 0.8) return colors.warning;
  return colors.error;
}

function getBillingPeriod(): string {
  const now = new Date();
  return now.toLocaleString('default', { month: 'long', year: 'numeric' });
}

export function UsageDashboard({ tier, usage, limits }: UsageDashboardProps) {
  const colors = useColors();

  // Estimate storage from storage_mb if provided, otherwise derive from item count
  // Rough estimate: ~0.5 MB per item (thumbnail + metadata)
  const storageMb = usage.storage_mb ?? usage.items_count * 0.5;
  const workspacesCount = usage.workspaces_count ?? 0;
  const storageMaxMb = limits.storage_gb * 1024;

  const formatStorageMb = (mb: number): string => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(0)} GB`;
    return `${mb} MB`;
  };

  const tierColors: Record<SubscriptionTier, string> = {
    free: colors.gray500,
    pro: colors.primary,
    business: colors.warning,
  };

  const tierLabel = tier === 'free' ? 'Free' : tier === 'pro' ? 'Pro' : 'Business';

  return (
    <Card variant="elevated" padding={16} style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Usage</Text>
        <Text style={[styles.billingPeriod, { color: colors.textSecondary }]}>{getBillingPeriod()}</Text>
      </View>

      <View style={styles.tierRow}>
        <View style={[styles.tierDot, { backgroundColor: tierColors[tier] }]} />
        <Text style={[styles.tierText, { color: colors.textSecondary }]}>{tierLabel} Plan</Text>
      </View>

      <View style={styles.metrics}>
        <MetricRow
          iconName="cube-outline"
          label="Items"
          value={usage.items_count}
          max={limits.max_items}
        />
        <MetricRow
          iconName="flash-outline"
          label="AI Scans"
          value={usage.ai_requests}
          max={limits.ai_requests_per_month}
        />
        <MetricRow
          iconName="cloud-download-outline"
          label="Storage"
          value={storageMb}
          max={storageMaxMb}
          formatValue={formatStorageMb}
          formatMax={formatStorageMb}
        />
        <MetricRow
          iconName="business-outline"
          label="Workspaces"
          value={workspacesCount}
          max={limits.max_workspaces}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  billingPeriod: {
    fontSize: 12,
    fontWeight: '500',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tierDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metrics: {
    gap: 14,
  },
  metricRow: {
    gap: 6,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    marginRight: 6,
  },
  metricLabel: {
    fontSize: 14,
  },
  metricCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
