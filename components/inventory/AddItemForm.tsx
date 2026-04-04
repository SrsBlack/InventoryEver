import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { uploadItemImage } from '../../lib/storage';
import { recognizeProductFromImage, parseReceipt, transcribeVoiceToItem } from '../../lib/ai';
import { analytics } from '../../lib/analytics';
import { useSubscription } from '../../hooks/useSubscription';
import { VoiceRecorder } from './VoiceRecorder';
import { BarcodeScanner } from './BarcodeScanner';
import { TagManager } from './TagManager';
import { lookupBarcode } from '../../lib/barcode';
import type { AddItemFormData, Category, ItemCondition } from '../../types';

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

interface AddItemFormProps {
  workspaceId: string;
  userId: string;
  categories: Category[];
  onItemAdded: (item: Partial<AddItemFormData>) => void;
  onCancel?: () => void;
}

const defaultFormData: AddItemFormData = {
  name: '',
  description: '',
  quantity: 1,
  unit: 'piece',
  purchase_price: '',
  purchase_date: new Date().toISOString().split('T')[0],
  location: '',
  location_details: '',
  category_id: '',
  brand: '',
  model: '',
  serial_number: '',
  warranty_expiry_date: '',
  warranty_provider: '',
  condition: 'excellent',
  main_image_url: '',
  receipt_image_url: '',
  tags: [],
};

export function AddItemForm({ workspaceId, userId, categories, onItemAdded, onCancel }: AddItemFormProps) {
  const [formData, setFormData] = useState<AddItemFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [step, setStep] = useState<'capture' | 'form'>('capture');
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const { checkLimit } = useSubscription(userId);

  const update = (field: keyof AddItemFormData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickAndAnalyzeImage = async (fromCamera = false) => {
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
    setPreviewImage(asset.uri);
    setAiLoading(true);
    setStep('form');

    try {
      // Upload image
      const publicUrl = await uploadItemImage(userId, asset.base64 ?? asset.uri);
      update('main_image_url', publicUrl);

      // Run AI recognition
      if (asset.base64) {
        const suggestion = await recognizeProductFromImage(asset.base64);
        setFormData(prev => ({
          ...prev,
          name: suggestion.name || prev.name,
          brand: suggestion.brand || prev.brand,
          model: suggestion.model || prev.model,
          description: suggestion.description || prev.description,
          purchase_price: suggestion.estimated_value
            ? String(suggestion.estimated_value)
            : prev.purchase_price,
          main_image_url: publicUrl,
        }));
        setAiConfidence(suggestion.confidence);
        analytics.track('ai_suggestion_applied', { confidence: suggestion.confidence });
      }
    } catch (err) {
      Alert.alert(
        'AI Processing',
        'Could not auto-fill from image. Please fill in details manually.',
        [{ text: 'OK' }]
      );
      analytics.track('ai_recognition_failed');
    } finally {
      setAiLoading(false);
    }
  };

  const scanReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setAiLoading(true);

    try {
      const publicUrl = await uploadItemImage(userId, asset.base64 ?? asset.uri);
      update('receipt_image_url', publicUrl);

      if (asset.base64) {
        const receiptData = await parseReceipt(asset.base64);
        setFormData(prev => ({
          ...prev,
          name: prev.name || `${receiptData.merchant} Purchase`,
          purchase_date: receiptData.date || prev.purchase_date,
          purchase_price: receiptData.total ? String(receiptData.total) : prev.purchase_price,
          receipt_image_url: publicUrl,
        }));
        analytics.track('receipt_scanned', { merchant: receiptData.merchant });
      }
      setStep('form');
    } catch {
      Alert.alert('Receipt Scan', 'Could not read receipt. Please fill in details manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleVoiceRecordingComplete = async (audioUri: string) => {
    const allowed = await checkLimit('ai_requests');
    if (!allowed) {
      Alert.alert(
        'AI Limit Reached',
        'You have reached your monthly AI requests limit. Upgrade to Pro for unlimited requests.',
        [
          { text: 'Enter Manually', onPress: () => { setShowVoiceRecorder(false); setStep('form'); } },
          { text: 'OK' },
        ]
      );
      return;
    }

    setAiLoading(true);

    try {
      const suggestion = await transcribeVoiceToItem(audioUri);
      setFormData(prev => ({
        ...prev,
        name: suggestion.name || prev.name,
        brand: suggestion.brand || prev.brand,
        description: suggestion.description || prev.description,
        quantity: suggestion.quantity ?? prev.quantity,
        location: suggestion.location || prev.location,
        purchase_price: suggestion.estimated_value
          ? String(suggestion.estimated_value)
          : prev.purchase_price,
      }));
      setAiConfidence(0.85);
      analytics.track('voice_input_applied');
      setShowVoiceRecorder(false);
      setStep('form');
    } catch {
      Alert.alert(
        'Voice Processing Failed',
        'Could not process your voice recording. Would you like to try again or enter details manually?',
        [
          { text: 'Try Again', onPress: () => setAiLoading(false) },
          { text: 'Manual Entry', onPress: () => { setShowVoiceRecorder(false); setStep('form'); } },
        ]
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleBarcodeScanned = async (data: string, _type: string) => {
    setShowBarcodeScanner(false);
    setAiLoading(true);
    setStep('form');

    // Always store raw barcode in serial_number
    update('serial_number', data);

    try {
      const product = await lookupBarcode(data);
      if (product) {
        setFormData(prev => ({
          ...prev,
          name: product.name || prev.name,
          brand: product.brand || prev.brand,
          description: product.description || prev.description,
          main_image_url: product.image_url || prev.main_image_url,
          serial_number: data,
        }));
        analytics.track('barcode_lookup_success', { barcode: data });
      } else {
        Alert.alert(
          'Product Not Found',
          'Product not found in database. You can enter details manually.',
          [{ text: 'OK' }]
        );
        analytics.track('barcode_lookup_not_found', { barcode: data });
      }
    } catch {
      Alert.alert(
        'Lookup Failed',
        'Could not look up this barcode. Please enter details manually.',
        [{ text: 'OK' }]
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Required', 'Please enter an item name.');
      return;
    }

    setLoading(true);
    try {
      const itemData: Partial<AddItemFormData> & { workspace_id: string; created_by: string } = {
        ...formData,
        workspace_id: workspaceId,
        created_by: userId,
        quantity: Number(formData.quantity) || 1,
      };
      onItemAdded(itemData);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'capture' && showVoiceRecorder) {
    return (
      <VoiceRecorder
        onRecordingComplete={handleVoiceRecordingComplete}
        onCancel={() => setShowVoiceRecorder(false)}
        isProcessing={aiLoading}
      />
    );
  }

  if (step === 'capture' && showBarcodeScanner) {
    return (
      <BarcodeScanner
        onBarcodeScanned={handleBarcodeScanned}
        onCancel={() => setShowBarcodeScanner(false)}
      />
    );
  }

  if (step === 'capture') {
    return (
      <View style={styles.captureScreen}>
        <Text style={styles.captureTitle}>Add Item</Text>
        <Text style={styles.captureSubtitle}>How would you like to add this item?</Text>

        <TouchableOpacity
          style={[styles.captureOption, { backgroundColor: Colors.primary + '15' }]}
          onPress={() => pickAndAnalyzeImage(true)}
          disabled={aiLoading}
        >
          <View style={styles.captureOptionIcon}>
            <Ionicons name="camera" size={28} color={Colors.primary} />
          </View>
          <View style={styles.captureOptionText}>
            <Text style={styles.captureOptionTitle}>Take a Photo</Text>
            <Text style={styles.captureOptionDesc}>AI will auto-fill item details</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureOption, { backgroundColor: Colors.accent + '15' }]}
          onPress={() => pickAndAnalyzeImage(false)}
          disabled={aiLoading}
        >
          <View style={styles.captureOptionIcon}>
            <Ionicons name="images" size={28} color={Colors.accent} />
          </View>
          <View style={styles.captureOptionText}>
            <Text style={styles.captureOptionTitle}>Choose from Gallery</Text>
            <Text style={styles.captureOptionDesc}>Select an existing photo</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureOption, { backgroundColor: Colors.success + '15' }]}
          onPress={scanReceipt}
          disabled={aiLoading}
        >
          <View style={styles.captureOptionIcon}>
            <Ionicons name="receipt" size={28} color={Colors.success} />
          </View>
          <View style={styles.captureOptionText}>
            <Text style={styles.captureOptionTitle}>Scan Receipt</Text>
            <Text style={styles.captureOptionDesc}>Extract purchase data automatically</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureOption, { backgroundColor: Colors.secondary + '15' }]}
          onPress={() => setShowVoiceRecorder(true)}
          disabled={aiLoading}
        >
          <View style={styles.captureOptionIcon}>
            <Ionicons name="mic" size={28} color={Colors.secondary} />
          </View>
          <View style={styles.captureOptionText}>
            <Text style={styles.captureOptionTitle}>Voice Input</Text>
            <Text style={styles.captureOptionDesc}>Describe your item and AI fills the rest</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureOption, { backgroundColor: Colors.info + '15' }]}
          onPress={() => setShowBarcodeScanner(true)}
          disabled={aiLoading}
        >
          <View style={styles.captureOptionIcon}>
            <Ionicons name="barcode" size={28} color={Colors.info} />
          </View>
          <View style={styles.captureOptionText}>
            <Text style={styles.captureOptionTitle}>Scan Barcode</Text>
            <Text style={styles.captureOptionDesc}>Look up product by barcode or QR code</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.captureOption, { backgroundColor: Colors.gray100 }]}
          onPress={() => setStep('form')}
        >
          <View style={styles.captureOptionIcon}>
            <Ionicons name="create" size={28} color={Colors.textSecondary} />
          </View>
          <View style={styles.captureOptionText}>
            <Text style={styles.captureOptionTitle}>Manual Entry</Text>
            <Text style={styles.captureOptionDesc}>Type in all the details yourself</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textTertiary} />
        </TouchableOpacity>

        {onCancel && (
          <Button title="Cancel" onPress={onCancel} variant="ghost" style={styles.cancelBtn} />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.formScroll}
      contentContainerStyle={styles.formContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Image Preview */}
      {previewImage && (
        <View style={styles.imagePreviewWrapper}>
          <Image source={{ uri: previewImage }} style={styles.imagePreview} />
          {aiLoading && (
            <View style={styles.aiOverlay}>
              <ActivityIndicator color={Colors.white} size="large" />
              <Text style={styles.aiText}>AI analyzing...</Text>
            </View>
          )}
          {aiConfidence !== null && !aiLoading && (
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                AI Confidence: {Math.round(aiConfidence * 100)}%
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Photo buttons */}
      <View style={styles.photoRow}>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => pickAndAnalyzeImage(true)}
          disabled={aiLoading}
        >
          <Ionicons name="camera" size={22} color={Colors.textSecondary} />
          <Text style={styles.photoBtnText}>Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={() => pickAndAnalyzeImage(false)}
          disabled={aiLoading}
        >
          <Ionicons name="images" size={22} color={Colors.textSecondary} />
          <Text style={styles.photoBtnText}>Gallery</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.photoBtn}
          onPress={scanReceipt}
          disabled={aiLoading}
        >
          <Ionicons name="receipt" size={22} color={Colors.textSecondary} />
          <Text style={styles.photoBtnText}>Receipt</Text>
        </TouchableOpacity>
      </View>

      {/* Core fields */}
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

      <View style={styles.row}>
        <Input
          label="Quantity"
          placeholder="1"
          value={String(formData.quantity)}
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

      {/* Category */}
      <Text style={styles.fieldLabel}>Category</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

      {/* Purchase Info */}
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

      {/* Tags */}
      <Text style={styles.sectionLabel}>Tags (optional)</Text>
      <TagManager
        mode="selector"
        workspaceId={workspaceId}
        selectedTagIds={formData.tags}
        onTagsChange={tagIds => update('tags', tagIds)}
      />

      {/* Warranty */}
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
          title="Save Item"
          onPress={handleSubmit}
          loading={loading}
          disabled={!formData.name.trim() || aiLoading}
          fullWidth
          size="lg"
        />
        {onCancel && (
          <Button
            title="Cancel"
            onPress={onCancel}
            variant="ghost"
            style={styles.cancelActionBtn}
            fullWidth
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // Capture screen
  captureScreen: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.background,
  },
  captureTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  captureSubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  captureOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  captureOptionIcon: {
    width: 40,
    alignItems: 'center',
    marginRight: 14,
  },
  captureOptionText: {
    flex: 1,
  },
  captureOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  captureOptionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  cancelBtn: {
    marginTop: 12,
  },

  // Form
  formScroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  formContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.gray100,
  },
  aiOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiText: {
    color: Colors.white,
    marginTop: 8,
    fontWeight: '600',
  },
  confidenceBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  confidenceText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  photoRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  photoBtn: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoBtnText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
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
  row: {
    flexDirection: 'row',
  },
  categoryScroll: {
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
  actions: {
    marginTop: 24,
  },
  cancelActionBtn: {
    marginTop: 8,
  },
});
