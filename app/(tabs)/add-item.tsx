import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useSubscriptionContext } from '../../contexts/SubscriptionContext';
import { useItems } from '../../hooks/useItems';
import { useTags } from '../../hooks/useTags';
import { AddItemForm } from '../../components/inventory/AddItemForm';
import { SkeletonFullScreen } from '../../components/ui/Skeleton';
import { useColors } from '../../hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import type { AddItemFormData, Category } from '../../types';

export default function AddItemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspaceContext();
  const { checkLimit, incrementUsage, tier } = useSubscriptionContext();
  const { addItem } = useItems(activeWorkspace?.id);
  const { setItemTags } = useTags(activeWorkspace?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  React.useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .or(`workspace_id.is.null,workspace_id.eq.${activeWorkspace?.id ?? 'none'}`)
        .order('name');
      setCategories((data ?? []) as Category[]);
      setCategoriesLoaded(true);
    };
    load();
  }, [activeWorkspace?.id]);

  const handleItemAdded = async (itemData: Partial<AddItemFormData>) => {
    if (!user || !activeWorkspace) {
      Alert.alert('Error', 'No active workspace. Please create one first.');
      return;
    }

    // Check tier limits
    const allowed = await checkLimit('items');
    if (!allowed) {
      Alert.alert(
        'Limit Reached',
        `Your ${tier} plan allows a limited number of items. Upgrade to Pro to add more!`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => router.push('/(tabs)/profile') },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      const { tags: tagIds, ...restItemData } = itemData;
      const newItem = await addItem({
        ...restItemData,
        workspace_id: activeWorkspace.id,
        created_by: user.id,
        quantity: Number(itemData.quantity) || 1,
        purchase_price: itemData.purchase_price ? parseFloat(String(itemData.purchase_price)) : undefined,
        currency: 'USD',
        condition: itemData.condition ?? 'excellent',
      });

      if (tagIds && tagIds.length > 0) {
        await setItemTags(newItem.id, tagIds);
      }

      await incrementUsage('items_count');

      Alert.alert('Success! 🎉', 'Item added to your inventory.', [
        { text: 'Add Another', onPress: () => {} },
        { text: 'View Inventory', onPress: () => router.push('/(tabs)/inventory') },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  if (!categoriesLoaded || saving) return <SkeletonFullScreen />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.divider, paddingTop: insets.top + 8 }]}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Add Item</Text>
      </View>
      <AddItemForm
        workspaceId={activeWorkspace?.id ?? ''}
        userId={user?.id ?? ''}
        categories={categories}
        onItemAdded={handleItemAdded}
        onCancel={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 0,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: '800' },
});
