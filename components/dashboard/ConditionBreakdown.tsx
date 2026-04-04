import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface ConditionBreakdownProps {
  items: Array<{ condition?: string }>;
}

const CONDITIONS = [
  { key: 'new', label: 'New', color: Colors.success },
  { key: 'excellent', label: 'Excellent', color: '#34D399' },
  { key: 'good', label: 'Good', color: Colors.warning },
  { key: 'fair', label: 'Fair', color: '#FBBF24' },
  { key: 'poor', label: 'Poor', color: Colors.error },
  { key: 'damaged', label: 'Damaged', color: '#DC2626' },
];

export function ConditionBreakdown({ items }: ConditionBreakdownProps) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const cond = (item.condition ?? '').toLowerCase();
      if (cond) {
        map[cond] = (map[cond] ?? 0) + 1;
      }
    }
    return map;
  }, [items]);

  const total = useMemo(() => Object.values(counts).reduce((s, n) => s + n, 0), [counts]);

  const conditionsWithData = CONDITIONS.filter(c => (counts[c.key] ?? 0) > 0);

  if (total === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No condition data yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Stacked bar */}
      <View style={styles.stackedBar}>
        {conditionsWithData.map((cond, index) => {
          const count = counts[cond.key] ?? 0;
          const pct = (count / total) * 100;
          return (
            <View
              key={cond.key}
              style={[
                styles.segment,
                {
                  width: `${pct}%` as `${number}%`,
                  backgroundColor: cond.color,
                  borderTopLeftRadius: index === 0 ? 6 : 0,
                  borderBottomLeftRadius: index === 0 ? 6 : 0,
                  borderTopRightRadius: index === conditionsWithData.length - 1 ? 6 : 0,
                  borderBottomRightRadius: index === conditionsWithData.length - 1 ? 6 : 0,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend grid */}
      <View style={styles.legend}>
        {conditionsWithData.map(cond => (
          <View key={cond.key} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: cond.color }]} />
            <Text style={styles.legendLabel}>{cond.label}</Text>
            <Text style={styles.legendCount}>{counts[cond.key]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  stackedBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
  },
  segment: {
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '47%',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
  },
  legendCount: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textTertiary,
  },
});
