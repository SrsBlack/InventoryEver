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
import { Colors } from '../../constants/colors';
import { Badge } from '../ui/Badge';
import { formatPrice, conditionColor, conditionLabel, warrantyStatus } from '../../lib/utils';
import type { Item } from '../../types';

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
        style={[styles.listCard, isSelected && styles.selectedCard]}
        onPress={handlePress}
        onLongPress={handleLongPress}
        activeOpacity={0.85}
      >
        <View style={styles.listImageWrapper}>
          {item.main_image_url ? (
            <Image source={{ uri: item.main_image_url }} style={styles.listImage} />
          ) : (
            <View style={styles.listImagePlaceholder}>
              {item.category?.icon_emoji ? (
                <Text style={styles.placeholderEmoji}>{item.category.icon_emoji}</Text>
              ) : (
                <Ionicons name="cube-outline" size={32} color={Colors.gray400} />
              )}
            </View>
          )}
          {selectionMode && (
            <View style={styles.checkboxOverlay}>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={14} color={Colors.white} />
                )}
              </View>
            </View>
          )}
        </View>
        <View style={styles.listContent}>
          <Text style={styles.listName} numberOfLines={1}>{item.name}</Text>
          {item.brand && (
            <Text style={styles.listMeta} numberOfLines={1}>{item.brand} {item.model ?? ''}</Text>
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
                <Text style={styles.itemTagMore}>+{item.tags.length - 3}</Text>
              )}
            </View>
          )}
          <View style={styles.listRow}>
            {item.location && (
              <Text style={styles.location} numberOfLines={1}>
                <Ionicons name="location-outline" size={12} color={Colors.textSecondary} />{' '}{item.location}
              </Text>
            )}
            {item.purchase_price && (
              <Text style={styles.price}>{formatPrice(item.purchase_price, item.currency)}</Text>
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
          <Text style={styles.qtyNum}>{item.quantity}</Text>
          <Text style={styles.qtyUnit}>{item.unit}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.gridCard, { width: GRID_ITEM_WIDTH }, isSelected && styles.selectedCard]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrapper}>
        {item.main_image_url ? (
          <Image source={{ uri: item.main_image_url }} style={styles.gridImage} />
        ) : (
          <View style={styles.gridImagePlaceholder}>
            {item.category?.icon_emoji ? (
              <Text style={styles.placeholderEmoji}>{item.category.icon_emoji}</Text>
            ) : (
              <Ionicons name="cube-outline" size={40} color={Colors.gray400} />
            )}
          </View>
        )}
        <View style={[styles.conditionDot, { backgroundColor: condColor }]} />
        {selectionMode && (
          <View style={styles.checkboxOverlay}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              )}
            </View>
          </View>
        )}
      </View>
      <View style={styles.gridContent}>
        <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
        {item.brand && (
          <Text style={styles.gridBrand} numberOfLines={1}>{item.brand}</Text>
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
              <Text style={styles.itemTagMore}>+{item.tags.length - 2}</Text>
            )}
          </View>
        )}
        <View style={styles.gridFooter}>
          {item.purchase_price ? (
            <Text style={styles.gridPrice}>{formatPrice(item.purchase_price, item.currency)}</Text>
          ) : (
            <Text style={styles.gridQty}>× {item.quantity}</Text>
          )}
          {item.location && (
            <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Grid styles
  gridCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    margin: 6,
  },
  imageWrapper: {
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: 130,
    backgroundColor: Colors.gray100,
  },
  gridImagePlaceholder: {
    width: '100%',
    height: 130,
    backgroundColor: Colors.gray100,
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
    color: Colors.textPrimary,
    lineHeight: 18,
    marginBottom: 2,
  },
  gridBrand: {
    fontSize: 11,
    color: Colors.textSecondary,
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
    color: Colors.primary,
  },
  gridQty: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },

  // List styles
  listCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.gray100,
  },
  listImagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 10,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  listMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
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
    color: Colors.textSecondary,
    flex: 1,
  },
  price: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
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
    color: Colors.textPrimary,
  },
  qtyUnit: {
    fontSize: 10,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  placeholderEmoji: {
    fontSize: 32,
  },

  // Selection styles
  selectedCard: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
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
    borderColor: Colors.gray400,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
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
    color: Colors.textTertiary,
    fontWeight: '600',
    alignSelf: 'center',
  },
});
