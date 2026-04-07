import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '../../hooks/useColors';
import { Badge } from '../ui/Badge';
import { formatPrice, conditionColor, conditionLabel, warrantyStatus } from '../../lib/utils';
import { CategoryIcons } from '../../constants/icons';
import type { Item } from '../../types';

/** Returns two gradient colors based on category name for a distinctive placeholder */
function categoryGradient(categoryName?: string): readonly [string, string] {
  const palettes: Record<string, [string, string]> = {
    'Electronics': ['#3B82F6', '#1D4ED8'],
    'Furniture':   ['#8B5CF6', '#6D28D9'],
    'Appliances':  ['#06B6D4', '#0891B2'],
    'Clothing':    ['#EC4899', '#BE185D'],
    'Tools':       ['#F59E0B', '#D97706'],
    'Sports':      ['#10B981', '#059669'],
    'Books':       ['#F97316', '#EA580C'],
    'Kitchen':     ['#EF4444', '#DC2626'],
    'Office':      ['#6366F1', '#4F46E5'],
    'Vehicles':    ['#64748B', '#475569'],
    'Jewelry':     ['#F59E0B', '#B45309'],
    'Art':         ['#A855F7', '#7C3AED'],
    'Garden':      ['#22C55E', '#16A34A'],
    'Toys':        ['#F472B6', '#EC4899'],
    'Music':       ['#14B8A6', '#0D9488'],
    'Health':      ['#10B981', '#047857'],
    'Pets':        ['#FB923C', '#EA580C'],
    'Other':       ['#94A3B8', '#64748B'],
  };
  const key = categoryName ?? 'Other';
  return palettes[key] ?? ['#94A3B8', '#64748B'];
}

interface ItemCardProps {
  item: Item;
  onPress: (item: Item) => void;
  viewMode?: 'grid' | 'list';
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onLongPress?: (item: Item) => void;
}

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 48) / 2;

export function ItemCard({
  item,
  onPress,
  viewMode = 'grid',
  selectionMode = false,
  isSelected = false,
  onSelect,
  onLongPress,
}: ItemCardProps) {
  const colors = useColors();
  const warranty = warrantyStatus(item.warranty_expiry_date);
  const condColor = conditionColor(item.condition);

  const handlePress = () => {
    if (selectionMode && onSelect) {
      onSelect();
    } else {
      onPress(item);
    }
  };

  const handleLongPress = () => {
    if (onLongPress) onLongPress(item);
  };

  if (viewMode === 'list') {
    return (
      <TouchableOpacity
        style={[
          styles.listCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
      >
        <View style={styles.listImageWrapper}>
          {item.main_image_url ? (
            <Image
              source={{ uri: item.main_image_url }}
              style={[styles.listImage, { backgroundColor: colors.gray100 }]}
            />
          ) : (
            <LinearGradient
              colors={categoryGradient(item.category?.name)}
              style={styles.listImagePlaceholder}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons
                name={CategoryIcons[item.category?.name ?? 'Other'] ?? 'cube-outline'}
                size={28}
                color="rgba(255,255,255,0.9)"
              />
            </LinearGradient>
          )}
          {selectionMode && (
            <View style={styles.checkboxOverlay}>
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: isSelected ? colors.primary : colors.gray400,
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                  },
                ]}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                )}
              </View>
            </View>
          )}
        </View>
        <View style={styles.listContent}>
          <Text style={[styles.listName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          {item.brand && (
            <Text style={[styles.listMeta, { color: colors.textSecondary }]} numberOfLines={1}>{item.brand} {item.model ?? ''}</Text>
          )}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.itemTagRow}>
              {item.tags.slice(0, 3).map(tag => (
                <View key={tag.id} style={[styles.itemTagPill, { backgroundColor: tag.color_hex + '22', borderColor: tag.color_hex }]}>
                  <View style={[styles.itemTagDot, { backgroundColor: tag.color_hex }]} />
                  <Text style={[styles.itemTagText, { color: tag.color_hex }]} numberOfLines={1}>{tag.name}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={[styles.itemTagMore, { color: colors.textTertiary }]}>+{item.tags.length - 3}</Text>
              )}
            </View>
          )}
          <View style={styles.listRow}>
            {item.location && (
              <Text style={[styles.location, { color: colors.textSecondary }]} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />{' '}{item.location}
              </Text>
            )}
            {item.purchase_price && (
              <Text style={[styles.price, { color: colors.primary }]}>{formatPrice(item.purchase_price, item.currency)}</Text>
            )}
          </View>
          <View style={styles.tagRow}>
            <Badge
              label={conditionLabel(item.condition)}
              backgroundColor={condColor + '22'}
              color={condColor}
              size="sm"
            />
            {item.warranty_expiry_date && (
              <Badge
                label={warranty.label}
                backgroundColor={warranty.color + '22'}
                color={warranty.color}
                size="sm"
                style={styles.tagGap}
              />
            )}
          </View>
        </View>
        <View style={styles.listQty}>
          <Text style={[styles.qtyNum, { color: colors.textPrimary }]}>{item.quantity}</Text>
          <Text style={[styles.qtyUnit, { color: colors.textSecondary }]}>{item.unit}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.gridCard,
        { width: GRID_ITEM_WIDTH, backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border, borderWidth: isSelected ? 2 : 1 },
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrapper}>
        {item.main_image_url ? (
          <Image source={{ uri: item.main_image_url }} style={[styles.gridImage, { backgroundColor: colors.gray100 }]} />
        ) : (
          <LinearGradient
            colors={categoryGradient(item.category?.name)}
            style={styles.gridImagePlaceholder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={CategoryIcons[item.category?.name ?? 'Other'] ?? 'cube-outline'}
              size={36}
              color="rgba(255,255,255,0.9)"
            />
          </LinearGradient>
        )}
        <View style={[styles.conditionDot, { backgroundColor: condColor }]} />
        {selectionMode && (
          <View style={styles.checkboxOverlay}>
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: isSelected ? colors.primary : colors.gray400,
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                },
              ]}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              )}
            </View>
          </View>
        )}
      </View>
      <View style={styles.gridContent}>
        <Text style={[styles.gridName, { color: colors.textPrimary }]} numberOfLines={2}>{item.name}</Text>
        {item.brand && (
          <Text style={[styles.gridBrand, { color: colors.textSecondary }]} numberOfLines={1}>{item.brand}</Text>
        )}
        {item.tags && item.tags.length > 0 && (
          <View style={styles.itemTagRow}>
            {item.tags.slice(0, 2).map(tag => (
              <View key={tag.id} style={[styles.itemTagPill, { backgroundColor: tag.color_hex + '22', borderColor: tag.color_hex }]}>
                <View style={[styles.itemTagDot, { backgroundColor: tag.color_hex }]} />
                <Text style={[styles.itemTagText, { color: tag.color_hex }]} numberOfLines={1}>{tag.name}</Text>
              </View>
            ))}
            {item.tags.length > 2 && (
              <Text style={[styles.itemTagMore, { color: colors.textTertiary }]}>+{item.tags.length - 2}</Text>
            )}
          </View>
        )}
        <View style={styles.gridFooter}>
          {item.purchase_price ? (
            <Text style={[styles.gridPrice, { color: colors.primary }]}>{formatPrice(item.purchase_price, item.currency)}</Text>
          ) : (
            <Text style={[styles.gridQty, { color: colors.textSecondary }]}>× {item.quantity}</Text>
          )}
          {item.location && (
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid styles
  gridCard: {
    borderRadius: 8,
    overflow: 'hidden',
    margin: 6,
  },
  imageWrapper: {
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: 130,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  gridContent: {
    padding: 10,
  },
  gridName: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
  gridBrand: {
    fontSize: 11,
    marginBottom: 6,
  },
  gridFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridPrice: {
    fontSize: 13,
    fontWeight: '700',
  },
  gridQty: {
    fontSize: 12,
    fontWeight: '500',
  },

  // List styles
  listCard: {
    flexDirection: 'row',
    borderRadius: 6,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  listImageWrapper: {
    marginRight: 12,
  },
  listImage: {
    width: 68,
    height: 68,
    borderRadius: 10,
  },
  listImagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  location: {
    fontSize: 12,
    flex: 1,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tagGap: {
    marginLeft: 6,
  },
  listQty: {
    alignItems: 'center',
    marginLeft: 12,
    minWidth: 36,
  },
  qtyNum: {
    fontSize: 18,
    fontWeight: '700',
  },
  qtyUnit: {
    fontSize: 10,
    textTransform: 'uppercase',
  },
  // Selection styles
  checkboxOverlay: {
    position: 'absolute',
    top: 6,
    left: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Item tag pills
  itemTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 4,
  },
  itemTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  itemTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 3,
  },
  itemTagText: {
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 60,
  },
  itemTagMore: {
    fontSize: 10,
    fontWeight: '600',
    alignSelf: 'center',
  },
});
