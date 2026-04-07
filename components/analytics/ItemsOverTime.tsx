import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import type { WeekBucket } from '../../lib/analyticsData';

interface ItemsOverTimeProps {
  data: WeekBucket[];
}

const MAX_BAR_HEIGHT = 60;

export function ItemsOverTime({ data }: ItemsOverTimeProps) {
  const colors = useColors();
  const maxCount = Math.max(...data.map(b => b.count), 1);
  const hasAnyData = data.some(b => b.count > 0);

  if (!hasAnyData) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No items added in the last 8 weeks</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.chart}>
        {data.map((bucket, index) => {
          const barHeight = Math.max((bucket.count / maxCount) * MAX_BAR_HEIGHT, bucket.count > 0 ? 4 : 0);
          // Highlight if this is the current week
          const isCurrentWeek = index === data.length - 1;
          const barColor = isCurrentWeek ? colors.primary : colors.primary + '60';
          // Split label into month and day
          const parts = bucket.weekLabel.split(' ');
          const month = parts[0] ?? '';
          const day = parts[1] ?? '';

          return (
            <View key={bucket.weekLabel} style={styles.barWrapper}>
              <View style={styles.barContainer}>
                {bucket.count > 0 && (
                  <Text style={[styles.countLabel, { color: colors.textSecondary }]}>{bucket.count}</Text>
                )}
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: barColor,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.labelMonth, { color: colors.textTertiary }]}>{month}</Text>
              <Text style={[styles.labelDay, { color: colors.textSecondary }]}>{day}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT + 40,
    gap: 4,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: MAX_BAR_HEIGHT + 16,
  },
  bar: {
    width: '80%',
    borderRadius: 3,
    minHeight: 0,
  },
  countLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 2,
  },
  labelMonth: {
    fontSize: 9,
    marginTop: 4,
    textAlign: 'center',
  },
  labelDay: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  empty: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
  },
});
