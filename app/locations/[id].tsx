import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Image,
  StatusBar,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useLocations } from '../../hooks/useLocations';
import { useItems } from '../../hooks/useItems';
import type { Item } from '../../types';

const Colors = {
  bg: '#0F1117',
  surface: '#1A1D27',
  border: '#252836',
  accent: '#3B82F6',
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  danger: '#EF4444',
  success: '#10B981',
};

export default function LocationDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeWorkspace } = useWorkspaceContext();
  const { locations, getLocationById, getChildren, buildBreadcrumb } =
    useLocations(activeWorkspace?.id);

  const location = id ? getLocationById(id) : undefined;
  const children = id ? getChildren(id) : [];
  const breadcrumb = id ? buildBreadcrumb(id) : [];

  const { items, loading: itemsLoading } = useItems(activeWorkspace?.id, {
    location_id: id,
  });

  const renderItem = ({ item }: { item: Item }) => (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={() => router.push(`/item/${item.id}`)}
      activeOpacity={0.75}
    >
      {item.main_image_url ? (
        <Image source={{ uri: item.main_image_url }} style={styles.itemImg} />
      ) : (
        <View style={[styles.itemImg, styles.itemImgPlaceholder]}>
          <Ionicons name="cube-outline" size={22} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.itemBody}>
        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
        {item.category && (
          <Text style={styles.itemMeta}>{item.category.icon_emoji} {item.category.name}</Text>
        )}
      </View>
      <Text style={styles.itemQty}>×{item.quantity}</Text>
    </TouchableOpacity>
  );

  if (!location) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LOCATION</Text>
          <View style={{ width: 32 }} />
        </View>
        <ActivityIndicator style={{ marginTop: 64 }} color={Colors.accent} />
      </SafeAreaView>
    );
  }

  const depthLabel = ['ROOM', 'AREA', 'SPOT'][location.depth] ?? 'LOCATION';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{location.name.toUpperCase()}</Text>
        <TouchableOpacity
          onPress={() => router.push(`/locations/manage?id=${location.id}`)}
          style={styles.editBtn}
        >
          <Ionicons name="pencil-outline" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Breadcrumb */}
        {breadcrumb.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.breadcrumbScroll}
            contentContainerStyle={styles.breadcrumbContent}
          >
            {breadcrumb.map((crumb, idx) => (
              <React.Fragment key={crumb.id}>
                {idx > 0 && (
                  <Ionicons name="chevron-forward" size={12} color={Colors.textMuted} style={{ marginTop: 3 }} />
                )}
                <TouchableOpacity onPress={() => router.push(`/locations/${crumb.id}`)}>
                  <Text style={[
                    styles.crumb,
                    idx === breadcrumb.length - 1 && styles.crumbActive,
                  ]}>
                    {crumb.name}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </ScrollView>
        )}

        {/* Location info card */}
        <View style={[styles.infoCard, { borderLeftColor: location.color_hex }]}>
          <View style={[styles.infoEmoji, { backgroundColor: location.color_hex + '33' }]}>
            <Text style={{ fontSize: 28 }}>{location.icon_emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>{depthLabel}</Text>
            <Text style={styles.infoName}>{location.name}</Text>
            {location.description && (
              <Text style={styles.infoDesc}>{location.description}</Text>
            )}
          </View>
        </View>

        {/* Sub-locations */}
        {children.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {location.depth === 0 ? 'AREAS' : 'SPOTS'} · {children.length}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {children.map(child => (
                <TouchableOpacity
                  key={child.id}
                  style={[styles.chip, { borderColor: child.color_hex }]}
                  onPress={() => router.push(`/locations/${child.id}`)}
                  activeOpacity={0.75}
                >
                  <Text style={{ fontSize: 14 }}>{child.icon_emoji}</Text>
                  <Text style={styles.chipText}>{child.name}</Text>
                  {child.item_count > 0 && (
                    <Text style={styles.chipCount}>{child.item_count}</Text>
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.chipAdd}
                onPress={() => router.push(`/locations/manage?parentId=${location.id}`)}
              >
                <Ionicons name="add" size={16} color={Colors.accent} />
                <Text style={styles.chipAddText}>Add</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ITEMS HERE · {location.item_count}</Text>

          {itemsLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={Colors.accent} />
          ) : items.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyItemsText}>No items at this location yet.</Text>
            </View>
          ) : (
            items.map(item => (
              <React.Fragment key={item.id}>
                {renderItem({ item })}
              </React.Fragment>
            ))
          )}
        </View>

        {/* QR Code section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QR CODE</Text>
          <View style={styles.qrCard}>
            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?data=${location.qr_code_token}&size=160x160&bgcolor=1A1D27&color=FFFFFF` }}
              style={styles.qrImage}
              resizeMode="contain"
            />
            <View style={styles.qrInfo}>
              <Text style={styles.qrToken}>{location.qr_code_token}</Text>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={async () => {
                  await Clipboard.setStringAsync(location.qr_code_token);
                  Alert.alert('Copied', 'QR token copied to clipboard.');
                }}
              >
                <Ionicons name="copy-outline" size={14} color={Colors.accent} />
                <Text style={styles.copyBtnText}>Copy Token</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 14, fontWeight: '700', letterSpacing: 2, color: Colors.text },
  editBtn: { padding: 4 },

  breadcrumbScroll: { maxHeight: 36, paddingHorizontal: 16, marginTop: 12 },
  breadcrumbContent: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  crumb: { fontSize: 12, color: Colors.textMuted, paddingVertical: 4 },
  crumbActive: { color: Colors.accent },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderLeftWidth: 3,
    margin: 16,
    padding: 16,
  },
  infoEmoji: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: Colors.textMuted },
  infoName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 2 },
  infoDesc: { fontSize: 13, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },

  section: { paddingHorizontal: 16, marginTop: 8, marginBottom: 8 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: Colors.textMuted,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { color: Colors.text, fontSize: 13 },
  chipCount: {
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: Colors.border,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  chipAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipAddText: { color: Colors.accent, fontSize: 13 },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemImg: { width: 44, height: 44, borderRadius: 6 },
  itemImgPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.border },
  itemBody: { flex: 1 },
  itemName: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  itemMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  itemQty: { color: Colors.textMuted, fontSize: 13 },

  emptyItems: { paddingVertical: 24, alignItems: 'center' },
  emptyItemsText: { color: Colors.textMuted, fontSize: 13 },

  qrCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  qrImage: { width: 80, height: 80, borderRadius: 6 },
  qrInfo: { flex: 1, gap: 8 },
  qrToken: { color: Colors.textMuted, fontSize: 12, fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyBtnText: { color: Colors.accent, fontSize: 13 },
});
