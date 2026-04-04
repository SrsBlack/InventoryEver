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
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Colors } from '../../../constants/colors';
import type { Item, Category, ItemCondition } from '../../../types';

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

  const [item, setItem] = useState<Item | null>(null);
  const [formData, setFormData] = useState<EditFormData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
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
    return <Spinner fullScreen label="Loading item..." />;
  }

  const hasImage = !!formData.main_image_url;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Item</Text>
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
              <Image source={{ uri: formData.main_image_url }} style={styles.image} />
              {imageUploading && (
                <View style={styles.imageOverlay}>
                  <ActivityIndicator color={Colors.white} size="large" />
                  <Text style={styles.imageOverlayText}>Uploading...</Text>
                </View>
              )}
            </View>
          ) : (
            <LinearGradient colors={Colors.gradientDark} style={styles.imagePlaceholder}>
              {imageUploading ? (
                <>
                  <ActivityIndicator color={Colors.white} size="large" />
                  <Text style={styles.imageOverlayText}>Uploading...</Text>
                </>
              ) : (
                <Ionicons name="cube" size={60} color={Colors.white} />
              )}
            </LinearGradient>
          )}
          <View style={styles.photoRow}>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={() => pickImage(true)}
              disabled={imageUploading}
            >
              <Ionicons name="camera" size={20} color={Colors.textSecondary} />
              <Text style={styles.photoBtnText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoBtn}
              onPress={() => pickImage(false)}
              disabled={imageUploading}
            >
              <Ionicons name="images" size={20} color={Colors.textSecondary} />
              <Text style={styles.photoBtnText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Item Details */}
        <Text style={styles.sectionLabel}>Item Details</Text>

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
        <Text style={styles.fieldLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                formData.category_id === cat.id && styles.categoryChipActive,
                formData.category_id === cat.id && { borderColor: cat.color_hex },
              ]}
              onPress={() => update('category_id', cat.id)}
            >
              <Ionicons
                name={getCategoryIcon(cat.name)}
                size={16}
                color={formData.category_id === cat.id ? cat.color_hex : Colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryChipText,
                  formData.category_id === cat.id && { color: cat.color_hex },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Condition */}
        <Text style={styles.fieldLabel}>Condition</Text>
        <View style={styles.conditionRow}>
          {CONDITIONS.map(c => (
            <TouchableOpacity
              key={c.value}
              style={[
                styles.conditionChip,
                formData.condition === c.value && styles.conditionChipActive,
              ]}
              onPress={() => update('condition', c.value)}
            >
              <Ionicons
                name={c.icon}
                size={20}
                color={formData.condition === c.value ? Colors.primary : Colors.textSecondary}
                style={styles.conditionIcon}
              />
              <Text
                style={[
                  styles.conditionLabel,
                  formData.condition === c.value && styles.conditionLabelActive,
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
        <Text style={styles.sectionLabel}>Purchase Details</Text>

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
          <Input
            label="Purchase Date"
            placeholder="YYYY-MM-DD"
            value={formData.purchase_date}
            onChangeText={v => update('purchase_date', v)}
            containerStyle={{ flex: 1 }}
          />
        </View>

        {/* Location */}
        <Text style={styles.sectionLabel}>Location</Text>

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
        <Text style={styles.sectionLabel}>Warranty & Serial</Text>

        <View style={styles.row}>
          <Input
            label="Warranty Expiry"
            placeholder="YYYY-MM-DD"
            value={formData.warranty_expiry_date}
            onChangeText={v => update('warranty_expiry_date', v)}
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
    backgroundColor: Colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: Colors.gray100,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
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
    backgroundColor: Colors.gray100,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageOverlayText: {
    color: Colors.white,
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
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  photoBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    backgroundColor: Colors.gray100,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: Colors.primary + '15',
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
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
    backgroundColor: Colors.gray100,
    minWidth: 64,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  conditionChipActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  conditionIcon: {
    marginBottom: 4,
  },
  conditionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  conditionLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
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
});
