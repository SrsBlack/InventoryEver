import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useItems } from '../../hooks/useItems';
import { ImageGallery } from '../../components/inventory/ImageGallery';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/colors';
import {
  formatPrice,
  formatDate,
  warrantyStatus,
  conditionColor,
  conditionLabel,
} from '../../lib/utils';
import { shareItemAsText, shareItemAsFile } from '../../lib/sharing';
import type { Item, MaintenanceLog } from '../../types';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { updateItem, deleteItem } = useItems(activeWorkspace?.id);

  const [item, setItem] = useState<Item | null>(null);
  const [galleryImages, setGalleryImages] = useState<Array<{ id: string; image_url: string; is_primary?: boolean }>>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Item>>({});
  const [maintenanceData, setMaintenanceData] = useState({
    maintenance_type: '',
    description: '',
    cost: '',
    performed_at: new Date().toISOString().split('T')[0],
    next_scheduled_date: '',
  });

  useEffect(() => {
    const fetchItem = async () => {
      setLoading(true);
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
        const itemData = data as Item;
        setItem(itemData);
        setEditData(itemData);

        // Build gallery images from item_images; fall back to main_image_url
        const itemImages: Array<{ id: string; image_url: string; is_primary?: boolean }> =
          itemData.images && itemData.images.length > 0
            ? itemData.images.map(img => ({ id: img.id, image_url: img.image_url }))
            : itemData.main_image_url
            ? [{ id: 'main', image_url: itemData.main_image_url, is_primary: true }]
            : [];
        setGalleryImages(itemImages);
      }

      // Fetch maintenance logs
      const { data: logs } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('item_id', id)
        .order('performed_at', { ascending: false });

      setMaintenanceLogs((logs ?? []) as MaintenanceLog[]);
      setLoading(false);
    };

    if (id) fetchItem();
  }, [id]);

  const handleSaveEdit = async () => {
    if (!item) return;
    try {
      const updated = await updateItem(item.id, editData);
      setItem(updated);
      setShowEditModal(false);
      Alert.alert('Saved', 'Item updated successfully.');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Update failed');
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Item', `Are you sure you want to delete "${item?.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(item!.id);
            router.back();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Delete failed');
          }
        },
      },
    ]);
  };

  const handleShare = () => {
    if (!item) return;
    Alert.alert('Share Item', 'Choose a format to share', [
      {
        text: 'Share as Text',
        onPress: () =>
          shareItemAsText(item).catch(err =>
            Alert.alert('Error', err instanceof Error ? err.message : 'Share failed')
          ),
      },
      {
        text: 'Export as JSON',
        onPress: () =>
          shareItemAsFile(item, 'json').catch(err =>
            Alert.alert('Error', err instanceof Error ? err.message : 'Export failed')
          ),
      },
      {
        text: 'Export as CSV',
        onPress: () =>
          shareItemAsFile(item, 'csv').catch(err =>
            Alert.alert('Error', err instanceof Error ? err.message : 'Export failed')
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleAddMaintenance = async () => {
    if (!item) return;
    const { error } = await supabase.from('maintenance_logs').insert([
      {
        item_id: item.id,
        maintenance_type: maintenanceData.maintenance_type,
        description: maintenanceData.description,
        cost: maintenanceData.cost ? parseFloat(maintenanceData.cost) : null,
        performed_at: maintenanceData.performed_at,
        next_scheduled_date: maintenanceData.next_scheduled_date || null,
      },
    ]);
    if (!error) {
      const { data: logs } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('item_id', item.id)
        .order('performed_at', { ascending: false });
      setMaintenanceLogs((logs ?? []) as MaintenanceLog[]);
      setShowMaintenanceModal(false);
      setMaintenanceData({
        maintenance_type: '',
        description: '',
        cost: '',
        performed_at: new Date().toISOString().split('T')[0],
        next_scheduled_date: '',
      });
    }
  };

  if (loading || !item) return <Spinner fullScreen label="Loading item..." />;

  const warranty = warrantyStatus(item.warranty_expiry_date);
  const condColor = conditionColor(item.condition);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Gallery */}
      <View style={styles.imageContainer}>
        <ImageGallery images={galleryImages} height={280} placeholderIcon="cube" />
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push(`/item/edit/${id}`)}>
            <Ionicons name="pencil" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={Colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.body}>
        {/* Title */}
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.brand && (
              <Text style={styles.itemBrand}>{item.brand}{item.model ? ` · ${item.model}` : ''}</Text>
            )}
          </View>
          <Badge
            label={conditionLabel(item.condition)}
            backgroundColor={condColor + '22'}
            color={condColor}
          />
        </View>

        {item.description && (
          <Text style={styles.description}>{item.description}</Text>
        )}

        {/* Key Stats */}
        <View style={styles.statsGrid}>
          <StatCard iconName="cube" label="Quantity" value={`${item.quantity} ${item.unit}`} />
          <StatCard iconName="cash" label="Value" value={formatPrice(item.purchase_price, item.currency)} />
          <StatCard iconName="calendar" label="Purchased" value={formatDate(item.purchase_date)} />
          <StatCard iconName="location" label="Location" value={item.location ?? '—'} />
        </View>

        {/* Details */}
        <Text style={styles.sectionTitle}>Details</Text>
        <Card variant="flat" padding={16} style={styles.detailCard}>
          {[
            { label: 'Category', value: item.category ? item.category.name : '—' },
            { label: 'Condition', value: conditionLabel(item.condition) },
            { label: 'Brand', value: item.brand ?? '—' },
            { label: 'Model', value: item.model ?? '—' },
            { label: 'Serial #', value: item.serial_number ?? '—' },
            { label: 'Purchase Date', value: formatDate(item.purchase_date) },
            { label: 'Purchase Price', value: formatPrice(item.purchase_price, item.currency) },
            { label: 'Current Value', value: formatPrice(item.current_value, item.currency) },
            { label: 'Location', value: item.location ?? '—' },
            { label: 'Location Detail', value: item.location_details ?? '—' },
          ].map(row => (
            <View key={row.label} style={styles.detailRow}>
              <Text style={styles.detailLabel}>{row.label}</Text>
              <Text style={styles.detailValue}>{row.value}</Text>
            </View>
          ))}
        </Card>

        {/* Warranty */}
        <Text style={styles.sectionTitle}>Warranty</Text>
        <Card
          variant="bordered"
          padding={16}
          style={[styles.warrantyCard, { borderColor: warranty.color }]}
        >
          <View style={styles.warrantyRow}>
            <View style={styles.warrantyIconWrapper}>
              <Ionicons name="shield-checkmark" size={24} color={warranty.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.warrantyStatus, { color: warranty.color }]}>
                {warranty.label}
              </Text>
              {item.warranty_expiry_date && (
                <Text style={styles.warrantyDate}>
                  Expires: {formatDate(item.warranty_expiry_date)}
                </Text>
              )}
              {item.warranty_provider && (
                <Text style={styles.warrantyProvider}>Provider: {item.warranty_provider}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Maintenance Logs */}
        <View style={styles.maintenanceHeader}>
          <Text style={styles.sectionTitle}>Maintenance</Text>
          <Button
            title="Log Service"
            onPress={() => setShowMaintenanceModal(true)}
            variant="outline"
            size="sm"
          />
        </View>

        {maintenanceLogs.length === 0 ? (
          <Text style={styles.noMaintenanceText}>No maintenance logs yet.</Text>
        ) : (
          maintenanceLogs.map(log => (
            <Card key={log.id} variant="flat" padding={12} style={styles.maintenanceCard}>
              <View style={styles.maintenanceRow}>
                <View style={styles.maintenanceIconWrapper}>
                  <Ionicons name="build" size={20} color={Colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.maintenanceType}>{log.maintenance_type ?? 'Service'}</Text>
                  {log.description && (
                    <Text style={styles.maintenanceDesc}>{log.description}</Text>
                  )}
                  <Text style={styles.maintenanceDate}>{formatDate(log.performed_at)}</Text>
                  {log.next_scheduled_date && (
                    <Text style={styles.maintenanceNext}>
                      Next: {formatDate(log.next_scheduled_date)}
                    </Text>
                  )}
                </View>
                {log.cost && (
                  <Text style={styles.maintenanceCost}>{formatPrice(log.cost)}</Text>
                )}
              </View>
            </Card>
          ))
        )}

        {/* Metadata */}
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Added {formatDate(item.created_at)}</Text>
          <Text style={styles.metaText}>Updated {formatDate(item.updated_at)}</Text>
        </View>
      </View>

      {/* Edit Modal */}
      <Modal visible={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Item">
        <Input
          label="Name"
          value={editData.name ?? ''}
          onChangeText={v => setEditData(d => ({ ...d, name: v }))}
          required
        />
        <Input
          label="Description"
          value={editData.description ?? ''}
          onChangeText={v => setEditData(d => ({ ...d, description: v }))}
          multiline
        />
        <Input
          label="Location"
          value={editData.location ?? ''}
          onChangeText={v => setEditData(d => ({ ...d, location: v }))}
          icon="location"
        />
        <Input
          label="Quantity"
          value={String(editData.quantity ?? 1)}
          onChangeText={v => setEditData(d => ({ ...d, quantity: parseInt(v) || 1 }))}
          keyboardType="numeric"
        />
        <Button title="Save Changes" onPress={handleSaveEdit} fullWidth />
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        visible={showMaintenanceModal}
        onClose={() => setShowMaintenanceModal(false)}
        title="Log Service"
      >
        <Input
          label="Type"
          placeholder="e.g. Oil Change, Cleaning, Repair"
          value={maintenanceData.maintenance_type}
          onChangeText={v => setMaintenanceData(d => ({ ...d, maintenance_type: v }))}
        />
        <Input
          label="Description"
          placeholder="What was done?"
          value={maintenanceData.description}
          onChangeText={v => setMaintenanceData(d => ({ ...d, description: v }))}
          multiline
        />
        <Input
          label="Cost"
          placeholder="0.00"
          value={maintenanceData.cost}
          onChangeText={v => setMaintenanceData(d => ({ ...d, cost: v }))}
          keyboardType="decimal-pad"
          icon="cash"
        />
        <Input
          label="Date Performed"
          value={maintenanceData.performed_at}
          onChangeText={v => setMaintenanceData(d => ({ ...d, performed_at: v }))}
        />
        <Input
          label="Next Service Date"
          placeholder="YYYY-MM-DD (optional)"
          value={maintenanceData.next_scheduled_date}
          onChangeText={v => setMaintenanceData(d => ({ ...d, next_scheduled_date: v }))}
        />
        <Button title="Save Log" onPress={handleAddMaintenance} fullWidth />
      </Modal>
    </ScrollView>
  );
}

function StatCard({ iconName, label, value }: { iconName: string; label: string; value: string }) {
  return (
    <Card variant="flat" padding={12} style={statStyles.card}>
      <Ionicons name={iconName as any} size={24} color={Colors.primary} style={statStyles.icon} />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </Card>
  );
}

const statStyles = StyleSheet.create({
  card: { flex: 1, alignItems: 'center', margin: 4 },
  icon: { marginBottom: 6 },
  value: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  label: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  imageContainer: { position: 'relative' },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageActions: {
    position: 'absolute',
    top: 48,
    right: 16,
    flexDirection: 'row',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.7)' },
  body: { padding: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  itemName: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  itemBrand: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  description: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginBottom: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, marginBottom: 12, marginTop: 4 },
  detailCard: { marginBottom: 20 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  detailLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 13, color: Colors.textPrimary, fontWeight: '600', flex: 1, textAlign: 'right' },
  warrantyCard: { marginBottom: 20 },
  warrantyRow: { flexDirection: 'row', alignItems: 'flex-start' },
  warrantyIconWrapper: { marginRight: 12 },
  warrantyStatus: { fontSize: 16, fontWeight: '700' },
  warrantyDate: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  warrantyProvider: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  maintenanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  noMaintenanceText: { fontSize: 14, color: Colors.textTertiary, marginBottom: 16 },
  maintenanceCard: { marginBottom: 8 },
  maintenanceRow: { flexDirection: 'row', alignItems: 'flex-start' },
  maintenanceIconWrapper: { marginRight: 10 },
  maintenanceType: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  maintenanceDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  maintenanceDate: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  maintenanceNext: { fontSize: 12, color: Colors.info, marginTop: 2, fontWeight: '500' },
  maintenanceCost: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    paddingBottom: 32,
  },
  metaText: { fontSize: 11, color: Colors.textTertiary },
});
