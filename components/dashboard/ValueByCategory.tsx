import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface ValueByCategoryProps {
  items: Array<{ category?: { name: string }; purchase_price?: number; current_value?: number }>;
}

const BAR_COLORS = [
  Colors.primary,
  Colors.accent,
  Colors.secondary,
  Colors.warning,
  Colors.info,
];

function formatValue(value: number): string {
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return '$' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function ValueByCategory({ items }: ValueByCategoryProps) {
  const topCategories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of items) {
      const name = item.category?.name ?? 'Uncategorized';
      const value = item.current_value ?? item.purchase_price ?? 0;
      map[name] = (map[name] ?? 0) + value;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [items]);

  if (topCategories.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No value data yet</Text>
      </View>
    );
  }

  const maxValue = topCategories[0].value;

  return (
    <View style={styles.container}>
      {topCategories.map((cat, index) => {
        const pct = maxValue > 0 ? cat.value / maxValue : 0;
        return (
          <View key={cat.name} style={styles.row}>
            <Text style={styles.label} numberOfLines={1}>{cat.name}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  {
                    width: `${Math.max(pct * 100, 4)}%` as `${number}%`,
                    backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                  },
                ]}
              />
            </View>
            <Text style={styles.valueText}>{formatValue(cat.value)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    width: 80,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 10,
    backgroundColor: Colors.gray100,
    borderRadius: 5,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 5,
  },
  valueText: {
    width: 44,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
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
