import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useLocations } from '../../hooks/useLocations';
import { useColors } from '../../hooks/useColors';
import type { Location } from '../../types';

export default function LocationsScreen() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceContext();
  const { locations, loading } = useLocations(activeWorkspace?.id);
  const colors = useColors();
  const [search, setSearch] = useState('');

  const rooms = locations.filter(l => {
    if (l.depth !== 0) return false;
    if (search.trim()) {
      return (
        l.name.toLowerCase().includes(search.toLowerCase()) ||
        (l.full_path ?? '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const getSubCount = (id: string) =>
    locations.filter(l => l.parent_id === id).length;

  const renderRoom = ({ item }: { item: Location }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: item.color_hex }]}
      onPress={() => router.push(`/locations/${item.id}`)}
      activeOpacity={0.75}
    >
      <View style={[styles.cardEmoji, { backgroundColor: item.color_hex + '33' }]}>
        <Text style={{ fontSize: 22 }}>{item.icon_emoji}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.cardName, { color: colors.textPrimary }]}>{item.name}</Text>
        <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
          {getSubCount(item.id) > 0
            ? `${getSubCount(item.id)} area${getSubCount(item.id) !== 1 ? 's' : ''} · `
            : ''}
          {item.item_count} item{item.item_count !== 1 ? 's' : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>LOCATIONS</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/locations/manage')}
        >
          <Ionicons name="add" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search locations..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 64 }} color={colors.primary} />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={item => item.id}
          renderItem={renderRoom}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="location-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>NO LOCATIONS YET</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create rooms to organise your inventory by physical location.
              </Text>
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/locations/manage')}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Add Location</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
  },
  addBtn: { padding: 4 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 14,
    gap: 12,
  },
  cardEmoji: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700' },
  cardMeta: { fontSize: 12, marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 12 },
  emptyTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginTop: 8,
  },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
