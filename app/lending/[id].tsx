import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextStyle,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLending } from '../../hooks/useLending';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useColors } from '../../hooks/useColors';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDistanceToNow, isPast, parseISO, format } from 'date-fns';

export default function LendingDetailScreen() {
  const router = useRouter();
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { active, history, markReturned, deleteRecord } = useLending(activeWorkspace?.id);

  const record = [...active, ...history].find(r => r.id === id);

  const [conditionReturned, setConditionReturned] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!record) {
    return (
      <View style={[styles.notFound, { flex: 1, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.textTertiary, fontSize: 15 }}>Record not found</Text>
      </View>
    );
  }

  const isReturned = !!record.returned_at;
  const isOverdue =
    !isReturned &&
    record.expected_return_date &&
    isPast(parseISO(record.expected_return_date));

  const handleMarkReturned = async () => {
    setSubmitting(true);
    try {
      await markReturned(record.id, conditionReturned || undefined, returnNotes || undefined);
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to mark as returned');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this lending record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteRecord(record.id);
            router.back();
          },
        },
      ]
    );
  };

  const statusBannerBg = isReturned ? colors.successLight : isOverdue ? colors.errorLight : colors.infoLight;
  const statusIconColor = isReturned ? colors.success : isOverdue ? colors.error : colors.primary;
  const statusTextColor = isReturned ? colors.success : isOverdue ? colors.error : colors.primary;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Lending Detail',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '700', letterSpacing: 1 } as any,
          headerRight: () => (
            <TouchableOpacity onPress={handleDelete} style={{ marginRight: 16 }}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[
          styles.statusBanner,
          { backgroundColor: statusBannerBg, borderBottomColor: colors.border },
        ]}>
          <Ionicons
            name={isReturned ? 'checkmark-circle' : isOverdue ? 'warning' : 'hand-left'}
            size={16}
            color={statusIconColor}
            style={{ marginRight: 8 }}
          />
          <Text style={[styles.statusText, { color: statusTextColor }]}>
            {isReturned
              ? `Returned ${formatDistanceToNow(parseISO(record.returned_at!), { addSuffix: true })}`
              : isOverdue
                ? `Overdue since ${record.expected_return_date}`
                : 'Currently lent out'}
          </Text>
        </View>

        <View style={styles.body}>
          {/* Item card */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>ITEM</Text>
          <TouchableOpacity
            style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push(`/item/${record.item_id}`)}
            activeOpacity={0.75}
          >
            <View style={styles.itemImageWrap}>
              {record.item?.main_image_url ? (
                <Image source={{ uri: record.item.main_image_url }} style={styles.itemImage} />
              ) : (
                <View style={[styles.itemImageFallback, { backgroundColor: colors.gray200 }]}>
                  <Ionicons name="cube-outline" size={24} color={colors.textTertiary} />
                </View>
              )}
            </View>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, { color: colors.textPrimary }]}>{record.item?.name ?? 'Unknown Item'}</Text>
              <Text style={[styles.itemSub, { color: colors.textTertiary }]}>Qty lent: {record.quantity_lent}</Text>
              {record.condition_lent && <Text style={[styles.itemSub, { color: colors.textTertiary }]}>Condition: {record.condition_lent}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          {/* Borrower */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>BORROWER</Text>
          <Card variant="bordered" padding={16} style={styles.infoCard}>
            <InfoRow icon="person" label="Name" value={record.borrower_name} colors={colors} />
            {record.borrower_phone && <InfoRow icon="call" label="Phone" value={record.borrower_phone} colors={colors} />}
            {record.borrower_email && <InfoRow icon="mail" label="Email" value={record.borrower_email} colors={colors} />}
          </Card>

          {/* Dates */}
          <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>TIMELINE</Text>
          <Card variant="bordered" padding={16} style={styles.infoCard}>
            <InfoRow icon="calendar" label="Lent on" value={format(parseISO(record.lent_at), 'MMM d, yyyy')} colors={colors} />
            {record.expected_return_date && (
              <InfoRow
                icon="alarm"
                label="Due back"
                value={format(parseISO(record.expected_return_date), 'MMM d, yyyy')}
                valueStyle={isOverdue ? { color: colors.error } : undefined}
                colors={colors}
              />
            )}
            {record.returned_at && (
              <InfoRow icon="checkmark-done" label="Returned" value={format(parseISO(record.returned_at), 'MMM d, yyyy')} colors={colors} />
            )}
            {record.condition_returned && (
              <InfoRow icon="star" label="Returned condition" value={record.condition_returned} colors={colors} />
            )}
          </Card>

          {record.notes && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>NOTES</Text>
              <Card variant="bordered" padding={16} style={styles.infoCard}>
                <Text style={[styles.notesText, { color: colors.textSecondary }]}>{record.notes}</Text>
              </Card>
            </>
          )}

          {/* Mark Returned form */}
          {!isReturned && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>MARK AS RETURNED</Text>
              <Input
                label="Condition when returned"
                placeholder="e.g. Good, Damaged"
                value={conditionReturned}
                onChangeText={setConditionReturned}
                icon="star"
              />
              <Input
                label="Return notes"
                placeholder="Any damage, comments..."
                value={returnNotes}
                onChangeText={setReturnNotes}
                icon="document-text"
                multiline
              />
              <Button
                title="Mark as Returned"
                onPress={handleMarkReturned}
                loading={submitting}
                fullWidth
                size="lg"
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueStyle,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  valueStyle?: object;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.divider }]}>
      <Ionicons name={icon as never} size={14} color={colors.textTertiary} style={{ marginRight: 8, width: 16 }} />
      <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.textPrimary }, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  body: { padding: 16, paddingBottom: 48 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 10,
    marginTop: 20,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  itemImageWrap: { width: 52, height: 52, borderRadius: 6, overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  itemImageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  itemSub: { fontSize: 12 },
  infoCard: { marginBottom: 4 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  infoLabel: { fontSize: 13, width: 120 },
  infoValue: { fontSize: 13, fontWeight: '500', flex: 1 },
  notesText: { fontSize: 14, lineHeight: 20 },
});
