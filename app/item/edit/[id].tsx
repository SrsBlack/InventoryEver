import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../../lib/supabase';
import { uploadItemImage } from '../../../lib/storage';
import { useWorkspaceContext } from '../../../contexts/WorkspaceContext';
import { useAuthContext } from '../../../contexts/AuthContext';
import { useItems } from '../../../hooks/useItems';
import { useTags } from '../../../hooks/useTags';
import { Input } from '../../../components/ui/Input';
import { DatePickerField } from '../../../components/ui/DatePickerField';
import { Button } from '../../../components/ui/Button';
import { SkeletonDetail } from '../../../components/ui/Skeleton';
import { useColors } from '../../../hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Item, Category, ItemCondition, Tag } from '../../../types';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const CONDITIONS: { value: ItemCondition; label: string; icon: IoniconsName }[] = [
  { value: 'new', label: 'New', icon: 'sparkles' },
  { value: 'excellent', label: 'Excellent', icon: 'star' },
  { value: 'good', label: 'Good', icon: 'thumbs-up' },
  { value: 'fair', label: 'Fair', icon: 'remove-circle' },
  { value: 'poor', label: 'Poor', icon: 'warning' },
  { value: 'damaged', label: 'Damaged', icon: 'heart-dislike' },
];

const CATEGORY_ICONS: Record<string, IoniconsName> = {
  electronics: 'laptop',
  furniture: 'bed',
  appliances: 'tv',
  clothing: 'shirt',
  tools: 'hammer',
  sports: 'football',
  books: 'book',
  kitchen: 'restaurant',
  office: 'briefcase',
  vehicles: 'car',
  jewelry: 'diamond',
  art: 'color-palette',
  garden: 'leaf',
  toys: 'game-controller',
  music: 'musical-notes',
  health: 'medkit',
  pets: 'paw',
  other: 'ellipsis-horizontal',
};

function getCategoryIcon(name: string): IoniconsName {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return 'cube';
}

interface EditFormData {
  name: string;
  brand: string;
  model: string;
  description: string;
  category_id: string;
  condition: ItemCondition;
  quantity: string;
  unit: string;
  purchase_price: string;
  purchase_date: string;
  location: string;
  location_details: string;
  warranty_expiry_date: string;
  warranty_provider: string;
  serial_number: string;
  main_image_url: string;
}

function itemToFormData(item: Item): EditFormData {
  return {
    name: item.name ?? '',
    brand: item.brand ?? '',
    model: item.model ?? '',
    description: item.description ?? '',
    category_id: item.category_id ?? '',
    condition: item.condition ?? 'good',
    quantity: String(item.quantity ?? 1),
    unit: item.unit ?? 'piece',
    purchase_price: item.purchase_price != null ? String(item.purchase_price) : '',
    purchase_date: item.purchase_date ?? '',
    location: item.location ?? '',
    location_details: item.location_details ?? '',
    warranty_expiry_date: item.warranty_expiry_date ?? '',
    warranty_provider: item.warranty_provider ?? '',
    serial_number: item.serial_number ?? '',
    main_image_url: item.main_image_url ?? '',
  };
}

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { user } = useAuthContext();
  const { updateItem } = useItems(activeWorkspace?.id);
  const { tags: workspaceTags, getItemTags, setItemTags } = useTags(activeWorkspace?.id ?? null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [loadingItem, setLoadingItem] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      setLoadingItem(true);
      const { data, error } = await supabase
        .from('items')
        .select(`
          *,
          category:categories(id, name, icon_emoji, color_hex),
          images:item_images(id, image_url, image_type, sort_order)
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        const fetched = data as Item;
        setItem(fetched);
        setFormData(itemToFormData(fetched));
        const existingTags = await getItemTags(id);
        setSelectedTagIds(existingTags.map(t => t.id));
      } else {
        Alert.alert('Error', 'Could not load item.');
        router.back();
      }
      setLoadingItem(false);
    };

    if (id) fetchItem();
  }, [id]);

  useEffect(() => {
    const fetchCategories = async () => {
      const wsId = activeWorkspace?.id;
      let query = supabase.from('categories').select('*');
      if (wsId) {
        query = query.or(`workspace_id.eq.${wsId},workspace_id.is.null`);
      }
      const { data } = await query.order('name');
      if (data) setCategories(data as Category[]);
    };
    fetchCategories();
  }, [activeWorkspace?.id]);

  const update = (field: keyof EditFormData, value: string) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : prev);
  };

  const pickImage = async (fromCamera = false) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
          base64: true,
        });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUploading(true);
    try {
      const publicUrl = await uploadItemImage(user?.id ?? '', asset.base64 ?? asset.uri);
      update('main_image_url', publicUrl);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload image. Please try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!formData || !item) return;

    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter an item name.');
      return;
    }

    setSaving(true);
    try {
      const updates: Partial<Item> = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || undefined,
        model: formData.model.trim() || undefined,
        description: formData.description.trim() || undefined,
        category_id: formData.category_id || undefined,
        condition: formData.condition,
        quantity: parseInt(formData.quantity) || 1,
        unit: formData.unit.trim() || 'piece',
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : undefined,
        purchase_date: formData.purchase_date.trim() || undefined,
        location: formData.location.trim() || undefined,
        location_details: formData.location_details.trim() || undefined,
        warranty_expiry_date: formData.warranty_expiry_date.trim() || undefined,
        warranty_provider: formData.warranty_provider.trim() || undefined,
        serial_number: formData.serial_number.trim() || undefined,
        main_image_url: formData.main_image_url || undefined,
      };

      await updateItem(item.id, updates);
      await setItemTags(item.id, selectedTagIds);
      Alert.alert('Saved', 'Item updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingItem || !formData) {
    return <SkeletonDetail />;
  }

  const hasImage = !!formData.main_image_url;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.gray100 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Edit Item</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Section */}
        <View style={styles.imageSection}>
          {hasImage ? (
            <View style={styles.imageWrapper}>
              <Image source={{ uri: formData.main_image_url }} style={[styles.image, { backgroundColor: colors.gray100 }]} />
              {imageUploading && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color={colors.white} size="large" />
                  <Text style={[styles.imageOverlayText, { color: colors.white }]}>Uploading...</Text>
                </View>
              )}
            </View>
          ) : (
            <LinearGradient colors={colors.gradientDark} style={styles.imagePlaceholder}>
              {imageUploading ? (
                <>
                  <ActivityIndicator color={colors.white} size="large" />
                  <Text style={[styles.imageOverlayText, { color: colors.white }]}>Uploading...</Text>
                </>
              ) : (
                <Ionicons name="cube" size={60} color={colors.white} />
              )}
            </LinearGradient>
          )}
          <View style={styles.photoRow}>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: colors.gray50, borderColor: colors.border }]}
              onPress={() => pickImage(true)}
              disabled={imageUploading}
            >
              <Ionicons name="camera" size={20} color={colors.textSecondary} />
              <Text style={[styles.photoBtnText, { color: colors.textSecondary }]}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: colors.gray50, borderColor: colors.border }]}
              onPress={() => pickImage(false)}
              disabled={imageUploading}
            >
              <Ionicons name="images" size={20} color={colors.textSecondary} />
              <Text style={[styles.photoBtnText, { color: colors.textSecondary }]}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Item Details */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Item Details</Text>

        <Input
          label="Name"
          required
          placeholder="e.g. Sony WH-1000XM5 Headphones"
          value={formData.name}
          onChangeText={v => update('name', v)}
        />

        <Input
          label="Brand"
          placeholder="e.g. Sony, Apple, IKEA"
          value={formData.brand}
          onChangeText={v => update('brand', v)}
        />

        <Input
          label="Model"
          placeholder="e.g. WH-1000XM5"
          value={formData.model}
          onChangeText={v => update('model', v)}
        />

        <Input
          label="Description"
          placeholder="Brief description"
          value={formData.description}
          onChangeText={v => update('description', v)}
          multiline
          numberOfLines={3}
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        {/* Category */}
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                { backgroundColor: colors.gray100 },
                formData.category_id === cat.id && { backgroundColor: colors.primary + '15', borderColor: cat.color_hex },
              ]}
              onPress={() => update('category_id', cat.id)}
            >
              <Ionicons
                name={getCategoryIcon(cat.name)}
                size={16}
                color={formData.category_id === cat.id ? cat.color_hex : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  { color: colors.textSecondary },
                  formData.category_id === cat.id && { color: cat.color_hex },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Condition */}
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Condition</Text>
        <View style={styles.conditionRow}>
          {CONDITIONS.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.conditionChip,
                { backgroundColor: colors.gray100 },
                formData.condition === c.value && { backgroundColor: colors.primary + '15', borderColor: colors.primary },
              ]}
              onPress={() => update('condition', c.value)}
            >
              <Ionicons
                name={c.icon}
                size={20}
                color={formData.condition === c.value ? colors.primary : colors.textSecondary}
                style={styles.conditionIcon}
              />
              <Text
                style={[
                  styles.conditionLabel,
                  { color: colors.textSecondary },
                  formData.condition === c.value && { color: colors.primary, fontWeight: '700' },
                ]}
              >
                {c.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quantity & Unit */}
        <View style={styles.row}>
          <Input
            label="Quantity"
            placeholder="1"
            value={formData.quantity}
            onChangeText={v => update('quantity', v)}
            keyboardType="numeric"
            containerStyle={{ flex: 1, marginRight: 8 }}
          />
          <Input
            label="Unit"
            placeholder="piece"
            value={formData.unit}
            onChangeText={v => update('unit', v)}
            containerStyle={{ flex: 1 }}
          />
        </View>

        {/* Purchase Details */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Purchase Details</Text>

        <View style={styles.row}>
          <Input
            label="Price Paid"
            placeholder="0.00"
            value={formData.purchase_price}
            onChangeText={v => update('purchase_price', v)}
            keyboardType="decimal-pad"
            icon="cash"
            containerStyle={{ flex: 1, marginRight: 8 }}
          />
          <DatePickerField
            label="Purchase Date"
            value={formData.purchase_date}
            onChange={v => update('purchase_date', v)}
            containerStyle={{ flex: 1 }}
          />
        </View>

        {/* Location */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Location</Text>

        <Input
          label="Room / Area"
          placeholder="e.g. Living Room, Garage"
          value={formData.location}
          onChangeText={v => update('location', v)}
          icon="location"
        />

        <Input
          label="Specific Location"
          placeholder="e.g. Top shelf, Left drawer"
          value={formData.location_details}
          onChangeText={v => update('location_details', v)}
        />

        {/* Warranty & Serial */}
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>Warranty & Serial</Text>

        <View style={styles.row}>
          <DatePickerField
            label="Warranty Expiry"
            value={formData.warranty_expiry_date}
            onChange={v => update('warranty_expiry_date', v)}
            containerStyle={{ flex: 1, marginRight: 8 }}
          />
          <Input
            label="Provider"
            placeholder="e.g. Apple Care"
            value={formData.warranty_provider}
            onChangeText={v => update('warranty_provider', v)}
            containerStyle={{ flex: 1 }}
          />
        </View>

        <Input
          label="Serial Number"
          placeholder="Enter serial number"
          value={formData.serial_number}
          onChangeText={v => update('serial_number', v)}
        />

        {/* Tags */}
        <View style={styles.tagsHeader}>
          <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginBottom: 0 }]}>Tags</Text>
          <TouchableOpacity
            style={[styles.addTagBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
            onPress={() => setShowTagPicker(v => !v)}
          >
            <Ionicons name={showTagPicker ? 'chevron-up' : 'add'} size={16} color={colors.primary} />
            <Text style={[styles.addTagBtnText, { color: colors.primary }]}>
              {showTagPicker ? 'Done' : 'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Selected tags row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagChipScroll}>
          {selectedTagIds.length === 0 ? (
            <Text style={[styles.noTagsText, { color: colors.textTertiary }]}>No tags applied</Text>
          ) : (
            selectedTagIds.map(tid => {
              const tag = workspaceTags.find(t => t.id === tid);
              if (!tag) return null;
              return (
                <TouchableOpacity
                  key={tag.id}
                  style={[styles.tagChip, { backgroundColor: tag.color_hex + '22', borderColor: tag.color_hex }]}
                  onPress={() => setSelectedTagIds(prev => prev.filter(x => x !== tag.id))}
                >
                  <View style={[styles.tagDot, { backgroundColor: tag.color_hex }]} />
                  <Text style={[styles.tagChipText, { color: tag.color_hex }]}>{tag.name}</Text>
                  <Ionicons name="close-circle" size={14} color={tag.color_hex} style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        {/* Tag picker */}
        {showTagPicker && workspaceTags.length > 0 && (
          <View style={[styles.tagPickerContainer, { backgroundColor: colors.gray50, borderColor: colors.border }]}>
            <View style={styles.tagPickerGrid}>
              {workspaceTags.map(tag => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    style={[
                      styles.tagPickerChip,
                      { backgroundColor: colors.gray100, borderColor: 'transparent' },
                      selected && { backgroundColor: tag.color_hex + '22', borderColor: tag.color_hex },
                    ]}
                    onPress={() =>
                      setSelectedTagIds(prev =>
                        selected ? prev.filter(x => x !== tag.id) : [...prev, tag.id]
                      )
                    }
                  >
                    <View style={[styles.tagDot, { backgroundColor: tag.color_hex }]} />
                    <Text style={[styles.tagChipText, { color: selected ? tag.color_hex : colors.textSecondary }]}>
                      {tag.name}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={13} color={tag.color_hex} style={{ marginLeft: 2 }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Save Changes"
            onPress={handleSave}
            loading={saving}
            disabled={!formData.name.trim() || imageUploading}
            fullWidth
            size="lg"
          />
          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="ghost"
            fullWidth
            style={styles.cancelBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  imageSection: {
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: 200,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    marginTop: 8,
    fontWeight: '600',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: 'row',
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    gap: 6,
  },
  photoBtnText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  chipScroll: {
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  conditionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  conditionChip: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 64,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  conditionIcon: {
    marginBottom: 4,
  },
  conditionLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
  },
  actions: {
    marginTop: 24,
  },
  cancelBtn: {
    marginTop: 8,
  },
  tagsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  addTagBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagChipScroll: {
    marginBottom: 12,
  },
  noTagsText: {
    fontSize: 13,
    paddingVertical: 4,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    marginRight: 8,
    gap: 4,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tagPickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  tagPickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPickerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
});
