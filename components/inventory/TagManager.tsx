import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useTags } from '../../hooks/useTags';
import type { Tag } from '../../types';

interface TagManagerProps {
  workspaceId: string;
  selectedTagIds?: string[];
  onTagsChange?: (tagIds: string[]) => void;
  mode?: 'selector' | 'manager';
}

export function TagManager({
  workspaceId,
  selectedTagIds = [],
  onTagsChange,
  mode = 'selector',
}: TagManagerProps) {
  const colors = useColors();

  const PRESET_COLORS = [
    colors.primary,
    colors.secondary,
    colors.accent,
    colors.success,
    colors.warning,
    colors.error,
    colors.info,
    colors.gray500,
  ];

  const { tags, loading, createTag, deleteTag } = useTags(workspaceId);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState<string>(colors.primary);
  const [creating, setCreating] = useState(false);

  const toggleTag = (tagId: string) => {
    if (!onTagsChange) return;
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId));
    } else {
      onTagsChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed) return;
    setCreating(true);
    const tag = await createTag(trimmed, newTagColor);
    setCreating(false);
    if (tag) {
      setNewTagName('');
      setNewTagColor(colors.primary);
      setShowCreateForm(false);
      if (onTagsChange && mode === 'selector') {
        onTagsChange([...selectedTagIds, tag.id]);
      }
    }
  };

  const handleDeleteTag = (tag: Tag) => {
    Alert.alert(
      'Delete Tag',
      `Delete "${tag.name}"? It will be removed from all items.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTag(tag.id);
            if (onTagsChange && selectedTagIds.includes(tag.id)) {
              onTagsChange(selectedTagIds.filter(id => id !== tag.id));
            }
          },
        },
      ]
    );
  };

  const CreateForm = () => (
    <View
      style={[
        styles.createForm,
        { backgroundColor: colors.gray50, borderColor: colors.border },
      ]}
    >
      <TextInput
        style={[
          styles.createInput,
          { backgroundColor: colors.surface, color: colors.textPrimary, borderColor: colors.border },
        ]}
        placeholder="Tag name..."
        placeholderTextColor={colors.textTertiary}
        value={newTagName}
        onChangeText={setNewTagName}
        autoFocus
        maxLength={30}
        returnKeyType="done"
        onSubmitEditing={handleCreateTag}
      />
      <View style={styles.colorRow}>
        {PRESET_COLORS.map(color => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorDot,
              { backgroundColor: color },
              newTagColor === color && [styles.colorDotSelected, { borderColor: colors.textPrimary }],
            ]}
            onPress={() => setNewTagColor(color)}
          />
        ))}
      </View>
      <View style={styles.createActions}>
        <TouchableOpacity
          style={[styles.createCancelBtn, { backgroundColor: colors.gray200 }]}
          onPress={() => {
            setShowCreateForm(false);
            setNewTagName('');
            setNewTagColor(colors.primary);
          }}
        >
          <Text style={[styles.createCancelText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.createAddBtn,
            { backgroundColor: !newTagName.trim() ? colors.gray300 : colors.primary },
          ]}
          onPress={handleCreateTag}
          disabled={!newTagName.trim() || creating}
        >
          {creating ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={[styles.createAddText, { color: colors.white }]}>Add</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  if (mode === 'manager') {
    return (
      <View style={styles.managerContainer}>
        <TouchableOpacity
          style={styles.createTagButton}
          onPress={() => setShowCreateForm(!showCreateForm)}
        >
          <Ionicons name="add-circle" size={18} color={colors.primary} />
          <Text style={[styles.createTagButtonText, { color: colors.primary }]}>Create Tag</Text>
        </TouchableOpacity>

        {showCreateForm && <CreateForm />}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : tags.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No tags yet. Create one above.</Text>
        ) : (
          tags.map(tag => (
            <View
              key={tag.id}
              style={[styles.managerRow, { borderBottomColor: colors.divider }]}
            >
              <View style={[styles.managerDot, { backgroundColor: tag.color_hex }]} />
              <Text style={[styles.managerTagName, { color: colors.textPrimary }]}>{tag.name}</Text>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteTag(tag)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="trash-outline" size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  }

  // Selector mode
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
        style={styles.selectorScroll}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.selectorLoader} />
        ) : (
          tags.map(tag => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <TouchableOpacity
                key={tag.id}
                style={[
                  styles.tagChip,
                  { borderColor: tag.color_hex, backgroundColor: selected ? tag.color_hex + '22' : colors.gray100 },
                ]}
                onPress={() => toggleTag(tag.id)}
                activeOpacity={0.75}
              >
                {selected && (
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={tag.color_hex}
                    style={styles.checkIcon}
                  />
                )}
                <View style={[styles.tagDot, { backgroundColor: tag.color_hex }]} />
                <Text style={[styles.tagChipText, { color: selected ? tag.color_hex : colors.textSecondary }, selected && styles.tagChipTextSelected]}>
                  {tag.name}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {!showCreateForm && (
          <TouchableOpacity
            style={[
              styles.addChipBtn,
              { borderColor: colors.border, backgroundColor: colors.gray50 },
            ]}
            onPress={() => setShowCreateForm(true)}
          >
            <Ionicons name="add" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </ScrollView>

      {showCreateForm && <CreateForm />}
    </View>
  );
}

const styles = StyleSheet.create({
  // Selector mode
  selectorScroll: {
    marginBottom: 4,
  },
  selectorContent: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  selectorLoader: {
    marginVertical: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  checkIcon: {
    marginRight: 3,
  },
  tagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagChipTextSelected: {
    fontWeight: '700',
  },
  addChipBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Create form
  createForm: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  createInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  colorRow: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 8,
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotSelected: {
    borderWidth: 2.5,
    transform: [{ scale: 1.15 }],
  },
  createActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  createCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  createCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  createAddBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 56,
    alignItems: 'center',
  },
  createAddText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Manager mode
  managerContainer: {
    paddingVertical: 4,
  },
  createTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  createTagButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  loader: {
    marginVertical: 12,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 12,
  },
  managerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  managerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  managerTagName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 4,
  },
});
