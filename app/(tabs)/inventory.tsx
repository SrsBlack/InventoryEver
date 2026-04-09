import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
  Modal as RNModal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { ItemCard } from '../../components/inventory/ItemCard';
import { BarcodeScanner } from '../../components/inventory/BarcodeScanner';
import { BulkActionBar } from '../../components/inventory/BulkActionBar';
import { SearchBar } from '../../components/inventory/SearchBar';
import { TagManager } from '../../components/inventory/TagManager';
import { SkeletonInventoryList } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { useColors } from '../../hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Item, ItemFilters, ItemCondition, WarrantyStatus } from '../../types';
import { LocationPicker } from '../../components/ui/LocationPicker';

type ViewMode = 'grid' | 'list';

export default function InventoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ItemFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const { items, loading, hasMore, fetchItems, loadMore, deleteItem } = useItems(
    activeWorkspace?.id,
    filters
  );

  const handleSearch = useCallback((query: string) => {
    setFilters(f => ({ ...f, search: query || undefined }));
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchItems(true),
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
    setRefreshing(false);
  }, [fetchItems]);

  const handleItemPress = useCallback(
    (item: Item) => router.push(`/item/${item.id}` as `/${string}`),
    [router]
  );

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleLongPress = useCallback((item: Item) => {
    if (!selectionMode) {
      setSelectionMode(true);
      setSelectedIds(new Set([item.id]));
    }
  }, [selectionMode]);

  const handleSelect = useCallback((item: Item) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map(id => deleteItem(id)));
      exitSelectionMode();
    } catch {
      Alert.alert('Error', 'Some items could not be deleted. Please try again.');
    }
  }, [selectedIds, deleteItem, exitSelectionMode]);

  const handleBulkExport = useCallback(async () => {
    const selectedItems = items.filter(item => selectedIds.has(item.id));
    const headers = ['id', 'name', 'brand', 'model', 'condition', 'quantity', 'unit', 'location', 'purchase_price', 'currency', 'purchase_date'];
    const rows = selectedItems.map(item =>
      headers.map(h => {
        const val = (item as unknown as Record<string, unknown>)[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');

    try {
      const fileUri = `${FileSystem.cacheDirectory}inventory_export_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Export Inventory' });
      } else {
        Alert.alert('Export', `File saved to: ${fileUri}`);
      }
      exitSelectionMode();
    } catch {
      Alert.alert('Error', 'Export failed. Please try again.');
    }
  }, [selectedIds, items, exitSelectionMode]);

  const handleBarcodeScanned = useCallback(
    (data: string) => {
      setShowBarcodeScanner(false);
      const matches = items.filter(item => item.barcode === data);
      if (matches.length === 0) {
        Alert.alert('No Item Found', `No item found with barcode ${data}`);
      } else if (matches.length === 1) {
        router.push(`/item/${matches[0].id}` as `/${string}`);
      } else {
        // Multiple matches — filter the list by barcode
        setFilters(f => ({ ...f, search: data }));
      }
    },
    [items, router]
  );

  const hasActiveFilters = !!(
    filters.category_id ||
    filters.condition ||
    filters.location ||
    filters.location_id ||
    filters.min_price !== undefined ||
    filters.max_price !== undefined ||
    (filters.tag_ids && filters.tag_ids.length > 0) ||
    filters.purchase_date_from ||
    filters.purchase_date_to ||
    (filters.warranty_status && filters.warranty_status.length > 0)
  );

  const renderItem = useCallback(
    ({ item }: { item: Item }) => (
      <ItemCard
        item={item}
        onPress={handleItemPress}
        viewMode={viewMode}
        selectionMode={selectionMode}
        isSelected={selectedIds.has(item.id)}
        onSelect={() => handleSelect(item)}
        onLongPress={handleLongPress}
      />
    ),
    [handleItemPress, viewMode, selectionMode, selectedIds, handleSelect, handleLongPress]
  );

  const renderFooter = useCallback(
    () =>
      loading && items.length > 0 ? (
        <Spinner size="small" label="Loading more..." />
      ) : null,
    [loading, items.length]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        {selectionMode ? (
          <>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {selectedIds.size} selected
            </Text>
            <TouchableOpacity onPress={exitSelectionMode} style={[styles.cancelButton, { backgroundColor: colors.gray200 }]}>
              <Text style={[styles.cancelText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>INVENTORY</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.viewToggle, { backgroundColor: colors.gray200 }]}
                onPress={() => setViewMode(v => (v === 'grid' ? 'list' : 'grid'))}
              >
                <Ionicons
                  name={viewMode === 'grid' ? 'list' : 'grid'}
                  size={18}
                  color={colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search + Barcode scan */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarFlex}>
          <SearchBar
            onSearch={handleSearch}
            onFilterPress={() => setShowFilters(true)}
            hasActiveFilters={hasActiveFilters}
          />
        </View>
        <TouchableOpacity
          style={[styles.barcodeScanBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowBarcodeScanner(true)}
          accessibilityRole="button"
          accessibilityLabel="Scan barcode to find item"
        >
          <Ionicons name="barcode-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Item count */}
      <View style={styles.countRow}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>
          {items.length} item{items.length !== 1 ? 's' : ''}
          {hasActiveFilters ? ' (filtered)' : ''}
        </Text>
        {hasActiveFilters && (
          <TouchableOpacity onPress={() => setFilters({})}>
            <Text style={[styles.clearFilters, { color: colors.primary }]}>Clear filters</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items List */}
      {loading && items.length === 0 ? (
        <SkeletonInventoryList />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Ionicons name={hasActiveFilters ? 'search' : 'cube-outline'} size={48} color={colors.primary} />}
          title={hasActiveFilters ? 'No results found' : 'Your inventory is empty'}
          description={
            hasActiveFilters
              ? 'Try adjusting your search or clearing filters.'
              : 'Start tracking everything you own in one place.'
          }
          bullets={
            hasActiveFilters ? undefined : [
              'Snap a photo to auto-fill details with AI',
              'Scan barcodes for instant product lookup',
              'Track warranties, value & maintenance',
              'Organize by location, tag, or category',
            ]
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : 'Add Your First Item'}
          onAction={() =>
            hasActiveFilters
              ? setFilters({})
              : router.push('/(tabs)/add-item')
          }
        />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={
            viewMode === 'grid' ? styles.gridContainer : styles.listContainer
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Barcode Scanner Modal (full screen) */}
      <RNModal
        visible={showBarcodeScanner}
        animationType="slide"
        onRequestClose={() => setShowBarcodeScanner(false)}
      >
        <BarcodeScanner
          onBarcodeScanned={handleBarcodeScanned}
          onCancel={() => setShowBarcodeScanner(false)}
        />
      </RNModal>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filter & Sort"
      >
        <FilterPanel
          filters={filters}
          workspaceId={activeWorkspace?.id ?? ''}
          onChange={setFilters}
          onApply={() => setShowFilters(false)}
          onReset={() => { setFilters({}); setShowFilters(false); }}
        />
      </Modal>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onDelete={handleBulkDelete}
        onExport={handleBulkExport}
        onClearSelection={exitSelectionMode}
      />
    </View>
  );
}

function FilterPanel({
  filters,
  workspaceId,
  onChange,
  onApply,
  onReset,
}: {
  filters: ItemFilters;
  workspaceId: string;
  onChange: (f: ItemFilters) => void;
  onApply: () => void;
  onReset: () => void;
}) {
  const colors = useColors();

  const WARRANTY_OPTIONS: { value: WarrantyStatus; label: string; color: string }[] = [
    { value: 'valid', label: 'Valid', color: colors.success },
    { value: 'expiring', label: 'Expiring', color: colors.warning },
    { value: 'expired', label: 'Expired', color: colors.error },
    { value: 'none', label: 'No Warranty', color: colors.gray500 },
  ];

  const CONDITIONS: { value: ItemCondition; label: string; iconName: React.ComponentProps<typeof Ionicons>['name'] }[] = [
    { value: 'new', label: 'New', iconName: 'sparkles' },
    { value: 'excellent', label: 'Excellent', iconName: 'star' },
    { value: 'good', label: 'Good', iconName: 'thumbs-up' },
    { value: 'fair', label: 'Fair', iconName: 'remove-circle' },
    { value: 'poor', label: 'Poor', iconName: 'warning' },
    { value: 'damaged', label: 'Damaged', iconName: 'heart-dislike' },
  ];

  const toggleWarrantyStatus = (value: WarrantyStatus) => {
    const current = filters.warranty_status ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, warranty_status: next.length > 0 ? next : undefined });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
      {/* Location */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>LOCATION</Text>
      <View style={{ marginBottom: 12 }}>
        <LocationPicker
          workspaceId={workspaceId}
          value={filters.location_id ?? null}
          onChange={locationId =>
            onChange({ ...filters, location_id: locationId ?? undefined, location: undefined })
          }
          placeholder="Any location"
        />
      </View>

      {/* Condition */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>CONDITION</Text>
      <View style={filterStyles.chipRow}>
        {CONDITIONS.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[
              filterStyles.chip,
              { backgroundColor: colors.gray200, borderColor: colors.border },
              filters.condition === c.value && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
            ]}
            onPress={() =>
              onChange({ ...filters, condition: filters.condition === c.value ? undefined : c.value })
            }
          >
            <Ionicons
              name={c.iconName}
              size={13}
              color={filters.condition === c.value ? colors.primary : colors.textSecondary}
              style={filterStyles.chipIcon}
            />
            <Text
              style={[
                filterStyles.chipText,
                { color: colors.textSecondary },
                filters.condition === c.value && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {c.label.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tags */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>TAGS</Text>
      <View style={filterStyles.tagSection}>
        <TagManager
          mode="selector"
          workspaceId={workspaceId}
          selectedTagIds={filters.tag_ids ?? []}
          onTagsChange={tagIds =>
            onChange({ ...filters, tag_ids: tagIds.length > 0 ? tagIds : undefined })
          }
        />
      </View>

      {/* Price Range */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>PRICE RANGE</Text>
      <View style={filterStyles.rangeRow}>
        <View style={[filterStyles.rangeInput, { backgroundColor: colors.gray100, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} style={filterStyles.rangeIcon} />
          <TextInput
            style={[filterStyles.rangeTextInput, { color: colors.textPrimary }]}
            placeholder="$0"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={filters.min_price !== undefined ? String(filters.min_price) : ''}
            onChangeText={val => {
              const num = parseFloat(val);
              onChange({ ...filters, min_price: val === '' ? undefined : isNaN(num) ? undefined : num });
            }}
          />
        </View>
        <Text style={[filterStyles.rangeSeparator, { color: colors.textSecondary }]}>—</Text>
        <View style={[filterStyles.rangeInput, { backgroundColor: colors.gray100, borderColor: colors.border }]}>
          <Ionicons name="cash-outline" size={16} color={colors.textSecondary} style={filterStyles.rangeIcon} />
          <TextInput
            style={[filterStyles.rangeTextInput, { color: colors.textPrimary }]}
            placeholder="No limit"
            placeholderTextColor={colors.textTertiary}
            keyboardType="numeric"
            value={filters.max_price !== undefined ? String(filters.max_price) : ''}
            onChangeText={val => {
              const num = parseFloat(val);
              onChange({ ...filters, max_price: val === '' ? undefined : isNaN(num) ? undefined : num });
            }}
          />
        </View>
      </View>

      {/* Date Range */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>DATE RANGE</Text>
      <View style={filterStyles.rangeRow}>
        <View style={[filterStyles.rangeInput, { backgroundColor: colors.gray100, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={filterStyles.rangeIcon} />
          <TextInput
            style={[filterStyles.rangeTextInput, { color: colors.textPrimary }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={filters.purchase_date_from ?? ''}
            onChangeText={val =>
              onChange({ ...filters, purchase_date_from: val || undefined })
            }
          />
        </View>
        <Text style={[filterStyles.rangeSeparator, { color: colors.textSecondary }]}>to</Text>
        <View style={[filterStyles.rangeInput, { backgroundColor: colors.gray100, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} style={filterStyles.rangeIcon} />
          <TextInput
            style={[filterStyles.rangeTextInput, { color: colors.textPrimary }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textTertiary}
            value={filters.purchase_date_to ?? ''}
            onChangeText={val =>
              onChange({ ...filters, purchase_date_to: val || undefined })
            }
          />
        </View>
      </View>

      {/* Warranty Status */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>WARRANTY STATUS</Text>
      <View style={filterStyles.chipRow}>
        {WARRANTY_OPTIONS.map(opt => {
          const active = (filters.warranty_status ?? []).includes(opt.value);
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                filterStyles.chip,
                { backgroundColor: colors.gray200, borderColor: colors.border },
                active && { backgroundColor: opt.color + '18', borderColor: opt.color },
              ]}
              onPress={() => toggleWarrantyStatus(opt.value)}
            >
              <Text
                style={[
                  filterStyles.chipText,
                  { color: colors.textSecondary },
                  active && { color: opt.color, fontWeight: '700' },
                ]}
              >
                {opt.label.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sort */}
      <Text style={[filterStyles.label, { color: colors.textSecondary }]}>SORT BY</Text>
      <View style={filterStyles.chipRow}>
        {(['name', 'created_at', 'purchase_date', 'purchase_price'] as const).map(s => (
          <TouchableOpacity
            key={s}
            style={[
              filterStyles.chip,
              { backgroundColor: colors.gray200, borderColor: colors.border },
              filters.sort_by === s && { backgroundColor: colors.primary + '18', borderColor: colors.primary },
            ]}
            onPress={() => onChange({ ...filters, sort_by: s })}
          >
            <Text
              style={[
                filterStyles.chipText,
                { color: colors.textSecondary },
                filters.sort_by === s && { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {(s === 'created_at' ? 'Date Added' :
               s === 'purchase_date' ? 'Purchase Date' :
               s === 'purchase_price' ? 'Price' : 'Name').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 16 }}>
        <Button title="Reset" onPress={onReset} variant="outline" style={{ flex: 1 }} />
        <Button title="Apply" onPress={onApply} style={{ flex: 1 }} />
      </View>
    </ScrollView>
  );
}

const filterStyles = StyleSheet.create({
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 1,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  chipIcon: { marginRight: 4 },
  chipText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  tagSection: {
    marginBottom: 16,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  rangeIcon: {
    marginRight: 6,
  },
  rangeTextInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  rangeSeparator: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  cancelText: { fontSize: 13, fontWeight: '600' },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
  },
  countText: { fontSize: 12, fontWeight: '500' },
  clearFilters: { fontSize: 12, fontWeight: '600' },
  gridContainer: { padding: 6 },
  listContainer: { paddingVertical: 4 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  searchBarFlex: { flex: 1 },
  barcodeScanBtn: {
    width: 44,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 8,
  },
});
