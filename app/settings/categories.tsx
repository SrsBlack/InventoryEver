import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useCategories } from '../../hooks/useCategories';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useColors } from '../../hooks/useColors';
import type { Category } from '../../types';

// ─── Constants ──────────────────────────────────────────────────────────────

const ICON_OPTIONS: Array<React.ComponentProps<typeof Ionicons>['name']> = [
  'cube-outline',
  'laptop-outline',
  'shirt-outline',
  'car-outline',
  'home-outline',
  'book-outline',
  'basketball-outline',
  'camera-outline',
  'musical-notes-outline',
  'medical-outline',
  'hammer-outline',
  'restaurant-outline',
  'gift-outline',
  'briefcase-outline',
  'bicycle-outline',
  'leaf-outline',
  'paw-outline',
  'game-controller-outline',
  'watch-outline',
  'headset-outline',
];

const COLOR_OPTIONS = [
  '#6C63FF',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#14B8A6',
  '#F97316',
  '#6B7280',
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface CategoryWithSystem extends Category {
  is_system?: boolean;
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function CategoriesScreen() {
  const { activeWorkspace } = useWorkspaceContext();
  const { categories, createCategory, updateCategory, deleteCategory } =
    useCategories(activeWorkspace?.id ?? null);
  const colors = useColors();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryWithSystem | null>(null);
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<
    React.ComponentProps<typeof Ionicons>['name']
  >('cube-outline');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [saving, setSaving] = useState(false);

  const systemCategories = (categories as CategoryWithSystem[]).filter(
    c => c.is_system,
  );
  const customCategories = (categories as CategoryWithSystem[]).filter(
    c => !c.is_system,
  );

  const openCreate = () => {
    setEditTarget(null);
    setName('');
    setSelectedIcon('cube-outline');
    setSelectedColor(COLOR_OPTIONS[0]);
    setShowModal(true);
  };

  const openEdit = (cat: CategoryWithSystem) => {
    setEditTarget(cat);
    setName(cat.name);
    setSelectedIcon(
      (cat.icon_emoji as React.ComponentProps<typeof Ionicons>['name']) ??
        'cube-outline',
    );
    setSelectedColor(cat.color_hex ?? COLOR_OPTIONS[0]);
    setShowModal(true);
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateCategory(editTarget.id, {
          name: trimmed,
          icon_emoji: selectedIcon as string,
          color_hex: selectedColor,
        });
      } else {
        await createCategory(trimmed, selectedIcon as string, selectedColor);
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (cat: CategoryWithSystem) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"? Items in this category will become uncategorized.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory(cat.id),
        },
      ],
    );
  };

  const renderSystemCategory = ({ item }: { item: CategoryWithSystem }) => (
    <View
      style={[
        styles.categoryRow,
        { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
      ]}
    >
      <View
        style={[styles.colorDot, { backgroundColor: item.color_hex ?? colors.gray300 }]}
      />
      <Ionicons
        name={
          (item.icon_emoji as React.ComponentProps<typeof Ionicons>['name']) ??
          'cube-outline'
        }
        size={20}
        color={colors.textSecondary}
        style={styles.rowIcon}
      />
      <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{item.name}</Text>
      <Badge label="System" size="sm" backgroundColor={colors.gray300} color={colors.gray700} />
    </View>
  );

  const renderCustomCategory = ({ item }: { item: CategoryWithSystem }) => (
    <View
      style={[
        styles.categoryRow,
        { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider },
      ]}
    >
      <View
        style={[styles.colorDot, { backgroundColor: item.color_hex ?? colors.gray300 }]}
      />
      <Ionicons
        name={
          (item.icon_emoji as React.ComponentProps<typeof Ionicons>['name']) ??
          'cube-outline'
        }
        size={20}
        color={colors.textSecondary}
        style={styles.rowIcon}
      />
      <Text style={[styles.categoryName, { color: colors.textPrimary }]}>{item.name}</Text>
      <TouchableOpacity
        onPress={() => openEdit(item)}
        hitSlop={8}
        style={styles.actionBtn}
      >
        <Ionicons name="pencil-outline" size={18} color={colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => handleDelete(item)}
        hitSlop={8}
        style={styles.actionBtn}
      >
        <Ionicons name="trash-outline" size={18} color={colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Categories' }} />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.body}>
          <Button
            title="Create Category"
            variant="outline"
            fullWidth
            onPress={openCreate}
            style={styles.createBtn}
          />

          {/* System categories */}
          {systemCategories.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>System</Text>
              <Card variant="bordered" padding={0} style={styles.listCard}>
                <FlatList
                  data={systemCategories}
                  keyExtractor={item => item.id}
                  renderItem={renderSystemCategory}
                  scrollEnabled={false}
                />
              </Card>
            </>
          )}

          {/* Custom categories */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Custom</Text>
          {customCategories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="color-palette-outline"
                size={40}
                color={colors.gray300}
                style={styles.emptyIcon}
              />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No custom categories yet</Text>
              <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                Tap "Create Category" to add your own
              </Text>
            </View>
          ) : (
            <Card variant="bordered" padding={0} style={styles.listCard}>
              <FlatList
                data={customCategories}
                keyExtractor={item => item.id}
                renderItem={renderCustomCategory}
                scrollEnabled={false}
              />
            </Card>
          )}
        </View>
      </View>

      {/* Create / Edit Modal */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title={editTarget ? 'Edit Category' : 'Create Category'}
        size="lg"
      >
        <Input
          label="Name"
          placeholder="e.g. Electronics, Furniture"
          value={name}
          onChangeText={setName}
          autoFocus
          required
        />

        {/* Icon picker */}
        <Text style={[styles.pickerLabel, { color: colors.textPrimary }]}>Icon</Text>
        <View style={styles.iconGrid}>
          {ICON_OPTIONS.map(icon => (
            <TouchableOpacity
              key={icon}
              style={[
                styles.iconCell,
                { backgroundColor: colors.gray100 },
                selectedIcon === icon && { borderColor: colors.primary, backgroundColor: colors.primary + '15' },
              ]}
              onPress={() => setSelectedIcon(icon)}
            >
              <Ionicons
                name={icon}
                size={22}
                color={
                  selectedIcon === icon ? colors.primary : colors.textSecondary
                }
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Color picker */}
        <Text style={[styles.pickerLabel, { color: colors.textPrimary }]}>Color</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map(color => (
            <TouchableOpacity
              key={color}
              style={[styles.colorSwatch, { backgroundColor: color }]}
              onPress={() => setSelectedColor(color)}
            >
              {selectedColor === color && (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.modalActions}>
          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => setShowModal(false)}
            style={styles.modalCancelBtn}
          />
          <Button
            title="Save"
            onPress={handleSave}
            loading={saving}
            disabled={!name.trim()}
            style={styles.modalSaveBtn}
          />
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16 },
  createBtn: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },
  listCard: { marginBottom: 20, overflow: 'hidden' },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  rowIcon: { marginRight: 10 },
  categoryName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actionBtn: { marginLeft: 12 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyIcon: { marginBottom: 12 },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: { flex: 1 },
  modalSaveBtn: { flex: 1 },
});
