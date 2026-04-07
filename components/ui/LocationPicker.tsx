import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  ScrollView,
  StyleSheet,
  ViewStyle,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocations } from '../../hooks/useLocations';
import { useColors } from '../../hooks/useColors';
import type { Location, LocationDepth } from '../../types';
import { LOCATION_DEPTH_LABELS } from '../../types';

interface LocationPickerProps {
  workspaceId: string;
  value: string | null;
  onChange: (locationId: string | null, location?: Location) => void;
  label?: string;
  placeholder?: string;
  allowCreate?: boolean;
  style?: ViewStyle;
}

export function LocationPicker({
  workspaceId,
  value,
  onChange,
  label,
  placeholder = 'Select location...',
  allowCreate = false,
  style,
}: LocationPickerProps) {
  const { locations, loading, createLocation, getLocationById, getChildren, buildBreadcrumb } =
    useLocations(workspaceId);
  const colors = useColors();

  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  // drill-down: array of location ids representing the current path (null = root)
  const [drillPath, setDrillPath] = useState<(string | null)[]>([null]);

  const selectedLocation = value ? getLocationById(value) : undefined;
  const currentParentId = drillPath[drillPath.length - 1];

  // ── Filtered list ────────────────────────────────────────────
  const displayList = useMemo(() => {
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      return locations.filter(
        l =>
          l.name.toLowerCase().includes(lower) ||
          (l.full_path ?? '').toLowerCase().includes(lower)
      );
    }
    return getChildren(currentParentId);
  }, [searchText, locations, currentParentId, getChildren]);

  const isSearching = searchText.trim().length > 0;

  const hasExactMatch = useMemo(
    () => locations.some(l => l.name.toLowerCase() === searchText.toLowerCase()),
    [locations, searchText]
  );

  // ── Breadcrumb label ─────────────────────────────────────────
  const breadcrumbLabel = useMemo(() => {
    if (drillPath.length === 1) return null; // at root
    const parentId = drillPath[drillPath.length - 1];
    if (!parentId) return null;
    return buildBreadcrumb(parentId).map(l => l.name).join(' > ');
  }, [drillPath, buildBreadcrumb]);

  // ── Current drill level ──────────────────────────────────────
  const currentLocation = currentParentId ? getLocationById(currentParentId) : undefined;
  const currentDepthLabel = currentLocation
    ? LOCATION_DEPTH_LABELS[(Math.min(currentLocation.depth + 1, 2)) as LocationDepth]
    : 'Room';

  // ── Handlers ─────────────────────────────────────────────────
  const handleSelect = useCallback((loc: Location) => {
    onChange(loc.id, loc);
    setModalVisible(false);
    setSearchText('');
    setDrillPath([null]);
  }, [onChange]);

  const handleDrillIn = useCallback((loc: Location) => {
    setDrillPath(prev => [...prev, loc.id]);
    setSearchText('');
  }, []);

  const handleBack = useCallback(() => {
    setDrillPath(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setSearchText('');
  }, []);

  const handleBreadcrumbTap = useCallback((index: number) => {
    setDrillPath(prev => prev.slice(0, index + 1));
    setSearchText('');
  }, []);

  const handleClear = useCallback(() => {
    onChange(null, undefined);
  }, [onChange]);

  const handleQuickCreate = useCallback(async () => {
    if (!searchText.trim()) return;
    try {
      const loc = await createLocation(searchText.trim(), currentParentId ?? undefined);
      handleSelect(loc);
    } catch {
      Alert.alert('Error', 'Could not create location.');
    }
  }, [searchText, currentParentId, createLocation, handleSelect]);

  const handleSelectCurrentLevel = useCallback(() => {
    if (!currentLocation) return;
    handleSelect(currentLocation);
  }, [currentLocation, handleSelect]);

  // ── Render a row ─────────────────────────────────────────────
  const renderRow = useCallback(({ item: loc }: { item: Location }) => {
    const children = getChildren(loc.id);
    const hasChildren = children.length > 0;

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border + '55' }]}
        onPress={() => (hasChildren && !isSearching ? handleDrillIn(loc) : handleSelect(loc))}
        onLongPress={() => handleSelect(loc)}
        activeOpacity={0.7}
      >
        {/* Emoji badge */}
        <View style={[styles.emojiBadge, { backgroundColor: loc.color_hex + '33' }]}>
          <Text style={styles.emojiText}>{loc.icon_emoji}</Text>
        </View>

        <View style={styles.rowTextWrap}>
          <Text style={[styles.rowName, { color: colors.textPrimary }]}>{loc.name}</Text>
          {isSearching && loc.full_path && loc.full_path !== loc.name && (
            <Text style={[styles.rowPath, { color: colors.textSecondary }]}>{loc.full_path}</Text>
          )}
        </View>

        <View style={styles.rowRight}>
          {loc.item_count > 0 && (
            <Text style={[styles.countBadge, { color: colors.textSecondary, backgroundColor: colors.surface }]}>{loc.item_count}</Text>
          )}
          {hasChildren && !isSearching && (
            <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [getChildren, isSearching, handleDrillIn, handleSelect, colors]);

  // ── Trigger row (closed state) ───────────────────────────────
  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        {selectedLocation ? (
          <View style={styles.triggerContent}>
            <Text style={styles.triggerEmoji}>{selectedLocation.icon_emoji}</Text>
            <Text style={[styles.triggerText, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedLocation.full_path ?? selectedLocation.name}
            </Text>
          </View>
        ) : (
          <Text style={[styles.triggerPlaceholder, { color: colors.textSecondary }]}>{placeholder}</Text>
        )}

        {selectedLocation ? (
          <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
        )}
      </TouchableOpacity>

      {/* ── Modal ── */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>SELECT LOCATION</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setSearchText(''); setDrillPath([null]); }}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search locations..."
                placeholderTextColor={colors.textSecondary}
                value={searchText}
                onChangeText={setSearchText}
                autoCapitalize="none"
                returnKeyType="search"
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Breadcrumb bar */}
            {!isSearching && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.breadcrumbScroll}
                contentContainerStyle={styles.breadcrumbContent}
              >
                <TouchableOpacity onPress={() => handleBreadcrumbTap(0)}>
                  <Text style={[
                    styles.crumbChip,
                    { color: colors.textSecondary, backgroundColor: colors.surface },
                    drillPath.length === 1 && { color: colors.primary, backgroundColor: colors.primary + '22' },
                  ]}>
                    All Rooms
                  </Text>
                </TouchableOpacity>
                {drillPath.slice(1).map((id, idx) => {
                  const loc = id ? getLocationById(id) : null;
                  return (
                    <React.Fragment key={id ?? idx}>
                      <Ionicons name="chevron-forward" size={12} color={colors.textSecondary} style={{ marginTop: 4 }} />
                      <TouchableOpacity onPress={() => handleBreadcrumbTap(idx + 1)}>
                        <Text style={[
                          styles.crumbChip,
                          { color: colors.textSecondary, backgroundColor: colors.surface },
                          idx === drillPath.length - 2 && { color: colors.primary, backgroundColor: colors.primary + '22' },
                        ]}>
                          {loc?.name ?? '...'}
                        </Text>
                      </TouchableOpacity>
                    </React.Fragment>
                  );
                })}
              </ScrollView>
            )}

            {/* Back button when drilled in */}
            {!isSearching && drillPath.length > 1 && (
              <View style={[styles.drillHeader, { borderBottomColor: colors.border }]}>
                <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
                  <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  <Text style={[styles.backBtnText, { color: colors.primary }]}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.levelLabel, { color: colors.textSecondary }]}>{currentDepthLabel}S IN {breadcrumbLabel?.toUpperCase()}</Text>
                <TouchableOpacity style={[styles.selectLevelBtn, { backgroundColor: colors.primary + '22' }]} onPress={handleSelectCurrentLevel}>
                  <Text style={[styles.selectLevelText, { color: colors.primary }]}>Select this</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* List */}
            {loading ? (
              <ActivityIndicator style={{ margin: 32 }} color={colors.primary} />
            ) : (
              <FlatList
                data={displayList}
                keyExtractor={item => item.id}
                renderItem={renderRow}
                contentContainerStyle={{ paddingBottom: 16 }}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {isSearching ? 'No locations match your search.' : `No ${currentDepthLabel.toLowerCase()}s yet.`}
                  </Text>
                }
                ListFooterComponent={
                  allowCreate && isSearching && !hasExactMatch && searchText.trim() ? (
                    <TouchableOpacity style={[styles.quickCreateRow, { borderTopColor: colors.border }]} onPress={handleQuickCreate}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <Text style={[styles.quickCreateText, { color: colors.primary }]}>
                        Create "{searchText.trim()}"
                      </Text>
                    </TouchableOpacity>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },

  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 48,
  },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  triggerEmoji: { fontSize: 16 },
  triggerText: { fontSize: 14, flex: 1 },
  triggerPlaceholder: { fontSize: 14, flex: 1 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    borderTopWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // Search
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },

  // Breadcrumb
  breadcrumbScroll: { maxHeight: 36, marginHorizontal: 16, marginTop: 8 },
  breadcrumbContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crumbChip: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },

  // Drill header
  drillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtnText: { fontSize: 13 },
  levelLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  selectLevelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  selectLevelText: { fontSize: 12, fontWeight: '600' },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  emojiBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 18 },
  rowTextWrap: { flex: 1 },
  rowName: { fontSize: 14, fontWeight: '600' },
  rowPath: { fontSize: 11, marginTop: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  countBadge: {
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },

  emptyText: { textAlign: 'center', marginTop: 32, fontSize: 13 },

  quickCreateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  quickCreateText: { fontSize: 14 },
});
