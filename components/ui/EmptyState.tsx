import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useColors } from '../../hooks/useColors';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  bullets?: string[];
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  bullets,
}: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.iconWrapper}>
          {typeof icon === 'string' ? (
            <Text style={styles.iconText}>{icon}</Text>
          ) : icon}
        </View>
      )}
      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
      {description && <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>}

      {bullets && bullets.length > 0 && (
        <View style={[styles.bulletsContainer, { backgroundColor: colors.gray100, borderColor: colors.border }]}>
          {bullets.map((bullet, i) => (
            <View key={i} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{bullet}</Text>
            </View>
          ))}
        </View>
      )}

      {actionLabel && onAction && (
        <Button
          title={actionLabel}
          onPress={onAction}
          style={styles.button}
          size="md"
        />
      )}
      {secondaryLabel && onSecondaryAction && (
        <Button
          title={secondaryLabel}
          onPress={onSecondaryAction}
          variant="ghost"
          style={styles.secondaryButton}
          size="md"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 28,
  },
  iconWrapper: {
    marginBottom: 12,
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bulletsContainer: {
    width: '100%',
    borderRadius: 4,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 8,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
  },
  bulletDot: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  bulletText: {
    fontSize: 14,
    lineHeight: 22,
    flex: 1,
  },
  button: {
    marginTop: 8,
  },
  secondaryButton: {
    marginTop: 4,
  },
});
