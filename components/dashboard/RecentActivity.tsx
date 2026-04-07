import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';

interface RecentActivityProps {
  items: Array<{ created_at: string }>;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_BAR_HEIGHT = 60;
const MIN_BAR_HEIGHT = 4;

export function RecentActivity({ items }: RecentActivityProps) {
  const colors = useColors();

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result: Array<{ label: string; count: number; date: Date }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      result.push({ label: DAY_LABELS[d.getDay()], count: 0, date: d });
    }

    for (const item of items) {
      const created = new Date(item.created_at);
      created.setHours(0, 0, 0, 0);
      const diffMs = created.getTime() - result[0].date.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 6) {
        result[diffDays].count += 1;
      }
    }

    return result;
  }, [items]);

  const totalThisWeek = days.reduce((s, d) => s + d.count, 0);
  const maxCount = Math.max(...days.map(d => d.count), 1);

  if (totalThisWeek === 0) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No items added this week</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {days.map((day, index) => {
          const barHeight =
            day.count > 0
              ? Math.max((day.count / maxCount) * MAX_BAR_HEIGHT, MIN_BAR_HEIGHT)
              : MIN_BAR_HEIGHT;
          const isToday = index === 6;
          return (
            <View key={index} style={styles.barColumn}>
              {day.count > 0 && (
                <Text style={[styles.countLabel, { color: colors.textPrimary }]}>{day.count}</Text>
              )}
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barHeight,
                      backgroundColor: isToday ? colors.primary : colors.primary + '60',
                    },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.dayLabel,
                  { color: isToday ? colors.primary : colors.textTertiary },
                  isToday && styles.dayLabelToday,
                ]}
              >
                {day.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: MAX_BAR_HEIGHT + 40,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 2,
  },
  countLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  barWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '70%',
    borderRadius: 3,
    minHeight: MIN_BAR_HEIGHT,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  dayLabelToday: {
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
