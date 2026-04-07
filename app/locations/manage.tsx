import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useLocations } from '../../hooks/useLocations';
import { useColors } from '../../hooks/useColors';
import type { Location, LocationDepth } from '../../types';
import { LOCATION_DEPTH_LABELS } from '../../types';

const PRESET_EMOJIS = ['📍', '🏠', '🛋️', '🛏️', '🚿', '🍳', '🚗', '📦', '🗄️', '🔧', '📚', '🖥️'];
const PRESET_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function ManageLocationScreen() {
  const router = useRouter();
  const { id, parentId } = useLocalSearchParams<{ id?: string; parentId?: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { locations, createLocation, updateLocation, deleteLocation, getLocationById } =
    useLocations(activeWorkspace?.id);
  const colors = useColors();

  const isEdit = Boolean(id);
  const existing: Location | undefined = id ? getLocationById(id) : undefined;

  const [name, setName] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [emoji, setEmoji] = useState('📍');
  const [color, setColor] = useState('#3B82F6');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Hydrate form for edit mode
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSelectedParentId(existing.parent_id ?? null);
      setEmoji(existing.icon_emoji);
      setColor(existing.color_hex);
      setDescription(existing.description ?? '');
    } else if (parentId) {
      setSelectedParentId(parentId);
    }
  }, [existing?.id, parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute what depth the new location will be
  const parentLocation = selectedParentId ? getLocationById(selectedParentId) : undefined;
  const newDepth: LocationDepth = parentLocation
    ? Math.min(parentLocation.depth + 1, 2) as LocationDepth
    : 0;
  const depthLabel = LOCATION_DEPTH_LABELS[newDepth];

  // Only show parents that would allow depth ≤ 2 (i.e. depth 0 or 1)
  const availableParents = locations.filter(l => l.depth <= 1 && l.id !== id);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a location name.');
      return;
    }
    setSaving(true);
    try {
      if (isEdit && id) {
        await updateLocation(id, {
          name: name.trim(),
          parent_id: selectedParentId ?? undefined,
          icon_emoji: emoji,
          color_hex: color,
          description: description.trim() || undefined,
        });
      } else {
        await createLocation(name.trim(), selectedParentId ?? undefined, emoji, color, description.trim() || undefined);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save location. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id || !existing) return;
    const msg = existing.item_count > 0
      ? `This location has ${existing.item_count} item${existing.item_count !== 1 ? 's' : ''}. Deleting it will un-assign those items. Continue?`
      : 'Delete this location? This cannot be undone.';

    Alert.alert('Delete Location', msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteLocation(id);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete location.');
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{isEdit ? 'EDIT LOCATION' : 'NEW LOCATION'}</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form}>
        {/* Type badge */}
        <View style={[styles.typeBadge, { backgroundColor: colors.primary + '22' }]}>
          <Ionicons name="location" size={14} color={colors.primary} />
          <Text style={[styles.typeBadgeText, { color: colors.primary }]}>{depthLabel}</Text>
        </View>

        {/* Name */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>NAME *</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder={`Enter ${depthLabel.toLowerCase()} name...`}
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Parent picker */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>PARENT LOCATION</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.parentChips}
          >
            <TouchableOpacity
              style={[
                styles.parentChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedParentId === null && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
              ]}
              onPress={() => setSelectedParentId(null)}
            >
              <Text style={[styles.parentChipText, { color: colors.textSecondary }, selectedParentId === null && { color: colors.primary }]}>
                None (Room)
              </Text>
            </TouchableOpacity>
            {availableParents.map(p => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.parentChip,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  selectedParentId === p.id && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => setSelectedParentId(p.id)}
              >
                <Text style={{ fontSize: 13 }}>{p.icon_emoji}</Text>
                <Text style={[styles.parentChipText, { color: colors.textSecondary }, selectedParentId === p.id && { color: colors.primary }]}>
                  {p.name}
                </Text>
                <Text style={[styles.parentChipDepth, { color: colors.textSecondary }]}>
                  {LOCATION_DEPTH_LABELS[p.depth as LocationDepth]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Emoji picker */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>ICON</Text>
          <View style={styles.emojiGrid}>
            {PRESET_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.emojiOption,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  emoji === e && { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
                ]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Color picker */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>COLOR</Text>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
                onPress={() => setColor(c)}
              >
                {color === c && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>DESCRIPTION (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="Add notes about this location..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Preview */}
        <View style={[styles.previewCard, { backgroundColor: colors.surface, borderLeftColor: color }]}>
          <View style={[styles.previewEmoji, { backgroundColor: color + '33' }]}>
            <Text style={{ fontSize: 24 }}>{emoji}</Text>
          </View>
          <View>
            <Text style={[styles.previewLabel, { color: colors.textSecondary }]}>{depthLabel}</Text>
            <Text style={[styles.previewName, { color: colors.textPrimary }]}>{name || `My ${depthLabel}`}</Text>
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>{isEdit ? 'Save Changes' : 'Create Location'}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete */}
        {isEdit && (
          <TouchableOpacity
            style={[styles.deleteBtn, { borderColor: colors.error }, deleting && { opacity: 0.6 }]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={colors.error} />
                <Text style={[styles.deleteBtnText, { color: colors.error }]}>Delete Location</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 2 },

  form: { padding: 16, gap: 20, paddingBottom: 48 },

  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  typeBadgeText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  field: { gap: 8 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputMultiline: { minHeight: 80, paddingTop: 12 },

  parentChips: { flexDirection: 'row', gap: 8 },
  parentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  parentChipText: { fontSize: 13 },
  parentChipDepth: { fontSize: 10, marginLeft: 2 },

  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },

  colorRow: { flexDirection: 'row', gap: 10 },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },

  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 16,
    marginTop: 4,
  },
  previewEmoji: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  previewName: { fontSize: 18, fontWeight: '700', marginTop: 2 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 4,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
});
