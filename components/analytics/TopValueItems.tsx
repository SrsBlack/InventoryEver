import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import type { TopItem } from '../../lib/analyticsData';

interface TopValueItemsProps {
  items: TopItem[];
}

function formatValue(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `$${value.toFixed(0)}`;
  }
}

export function TopValueItems({ items }: TopValueItemsProps) {
  const colors = useColors();

  const RANK_COLORS = [colors.warning, colors.gray400, colors.gray400, colors.gray400, colors.gray400];

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No value data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => (
        <View
          key={item.id}
          style={[
            styles.row,
            index < items.length - 1 && [styles.rowBorder, { borderBottomColor: colors.divider }],
          ]}
        >
          <View style={[styles.rank, { borderColor: RANK_COLORS[index] }]}>
            <Text style={[styles.rankText, { color: RANK_COLORS[index] }]}>{index + 1}</Text>
          </View>
          <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.value, { color: colors.accent }]}>{formatValue(item.value, item.currency)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 1,
  },
  rank: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
