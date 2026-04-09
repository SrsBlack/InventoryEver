import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useColors } from '../../hooks/useColors';

// ─── Base shimmer block ───────────────────────────────────────────────────────

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBlock({ width = '100%', height = 16, borderRadius = 6, style }: SkeletonBlockProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 0.9]),
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.gray200,
        },
        animStyle,
        style,
      ]}
    />
  );
}

// ─── Item card skeleton (matches ItemCard layout) ────────────────────────────

export function SkeletonItemCard() {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Thumbnail */}
      <SkeletonBlock width={64} height={64} borderRadius={8} />
      <View style={styles.cardBody}>
        {/* Name */}
        <SkeletonBlock width="70%" height={14} borderRadius={4} />
        <View style={{ height: 6 }} />
        {/* Brand / category */}
        <SkeletonBlock width="45%" height={11} borderRadius={4} />
        <View style={{ height: 10 }} />
        {/* Tag row */}
        <View style={styles.tagRow}>
          <SkeletonBlock width={48} height={20} borderRadius={4} style={styles.tagBlock} />
          <SkeletonBlock width={56} height={20} borderRadius={4} style={styles.tagBlock} />
        </View>
      </View>
    </View>
  );
}

// ─── Alert row skeleton ──────────────────────────────────────────────────────

export function SkeletonAlertRow() {
  const colors = useColors();
  return (
    <View style={[styles.alertRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SkeletonBlock width={28} height={28} borderRadius={4} />
      <View style={styles.alertBody}>
        <SkeletonBlock width="60%" height={13} borderRadius={4} />
        <View style={{ height: 5 }} />
        <SkeletonBlock width="80%" height={11} borderRadius={4} />
      </View>
    </View>
  );
}

// ─── Detail screen skeleton ──────────────────────────────────────────────────

export function SkeletonDetail() {
  const colors = useColors();
  return (
    <View style={[styles.detail, { backgroundColor: colors.background }]}>
      {/* Hero image */}
      <SkeletonBlock width="100%" height={240} borderRadius={0} />
      <View style={styles.detailBody}>
        {/* Name */}
        <SkeletonBlock width="75%" height={22} borderRadius={6} />
        <View style={{ height: 8 }} />
        {/* Brand */}
        <SkeletonBlock width="40%" height={14} borderRadius={4} />
        <View style={{ height: 20 }} />
        {/* 3 info rows */}
        {[1, 2, 3].map(i => (
          <View key={i} style={styles.detailRow}>
            <SkeletonBlock width={90} height={12} borderRadius={4} />
            <SkeletonBlock width={120} height={12} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Dashboard stat card skeleton ────────────────────────────────────────────

export function SkeletonDashboard() {
  const colors = useColors();
  return (
    <View style={[styles.dashboard, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.dashHeader}>
        <SkeletonBlock width={120} height={24} borderRadius={6} />
        <SkeletonBlock width={28} height={28} borderRadius={4} />
      </View>
      {/* Stat cards */}
      <View style={styles.statsRow}>
        {[1, 2, 3].map(i => (
          <View key={i} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonBlock width="60%" height={20} borderRadius={4} />
            <View style={{ height: 6 }} />
            <SkeletonBlock width="40%" height={11} borderRadius={4} />
          </View>
        ))}
      </View>
      {/* List items */}
      {[1, 2, 3, 4].map(i => (
        <SkeletonItemCard key={i} />
      ))}
    </View>
  );
}

// ─── Inventory list skeleton ─────────────────────────────────────────────────

export function SkeletonInventoryList() {
  return (
    <View style={{ flex: 1 }}>
      {[1, 2, 3, 4, 5, 6].map(i => (
        <SkeletonItemCard key={i} />
      ))}
    </View>
  );
}

// ─── Alerts list skeleton ────────────────────────────────────────────────────

export function SkeletonAlertList() {
  return (
    <View style={{ flex: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <SkeletonAlertRow key={i} />
      ))}
    </View>
  );
}

// ─── Generic full-screen skeleton ────────────────────────────────────────────

export function SkeletonFullScreen() {
  const colors = useColors();
  return (
    <View style={[styles.fullScreen, { backgroundColor: colors.background }]}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={{ marginBottom: 12 }}>
          <SkeletonBlock width="90%" height={16} borderRadius={6} />
          <View style={{ height: 6 }} />
          <SkeletonBlock width="60%" height={12} borderRadius={4} />
        </View>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  tagRow: {
    flexDirection: 'row',
  },
  tagBlock: {
    marginRight: 6,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
  },
  alertBody: {
    flex: 1,
    marginLeft: 12,
  },
  detail: {
    flex: 1,
  },
  detailBody: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dashboard: {
    flex: 1,
    padding: 16,
  },
  dashHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  fullScreen: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
});
