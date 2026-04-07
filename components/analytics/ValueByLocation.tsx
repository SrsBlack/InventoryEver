import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import type { LocationValue } from '../../lib/analyticsData';

interface ValueByLocationProps {
  data: LocationValue[];
}

function formatValue(value: number): string {
  if (value >= 1000) {
    return '$' + (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return '$' + value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function ValueByLocation({ data }: ValueByLocationProps) {
  const colors = useColors();

  const BAR_COLORS = [
    colors.primary,
    colors.accent,
    colors.secondary,
    colors.warning,
    colors.info,
  ];

  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No location data yet</Text>
      </View>
    );
  }

  const maxValue = data[0].value;

  return (
    <View style={styles.container}>
      {data.map((loc, index) => {
        const pct = maxValue > 0 ? loc.value / maxValue : 0;
        return (
          <View key={loc.name} style={styles.row}>
            <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>{loc.name}</Text>
            <View style={[styles.barTrack, { backgroundColor: colors.gray100 }]}>
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
            <Text style={[styles.valueText, { color: colors.textPrimary }]}>{formatValue(loc.value)}</Text>
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
    width: 100,
    fontSize: 13,
    fontWeight: '500',
  },
  barTrack: {
    flex: 1,
    height: 10,
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
    textAlign: 'right',
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
