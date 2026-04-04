import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { useSubscriptionContext } from '../../contexts/SubscriptionContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useColors } from '../../hooks/useColors';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { TIER_LIMITS } from '../../types';
import { UsageDashboard } from '../../components/profile/UsageDashboard';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, signOut } = useAuthContext();
  const { activeWorkspace, workspaces, createWorkspace, switchWorkspace } = useWorkspaceContext();
  const { tier, limits, purchasePro, purchaseBusiness, restorePurchases } =
    useSubscriptionContext();
  const { theme, setTheme } = useTheme();
  const colors = useColors();
  const [showNewWorkspace, setShowNewWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [currentUsage, setCurrentUsage] = useState({
    items_count: 0,
    ai_requests: 0,
    storage_mb: 0,
    workspaces_count: 0,
  });

  useEffect(() => {
    if (!user?.id) return;
    const month = new Date().toISOString().slice(0, 7) + '-01';
    supabase
      .from('usage_tracking')
      .select('items_count, ai_requests, storage_mb')
      .eq('user_id', user.id)
      .eq('month', month)
      .single()
      .then(({ data }) => {
        if (data) {
          setCurrentUsage(prev => ({
            ...prev,
            items_count: data.items_count ?? 0,
            ai_requests: data.ai_requests ?? 0,
            storage_mb: data.storage_mb ?? 0,
          }));
        }
      });
  }, [user?.id]);

  useEffect(() => {
    setCurrentUsage(prev => ({ ...prev, workspaces_count: workspaces.length }));
  }, [workspaces.length]);

  const tierColors = {
    free: colors.gray500,
    pro: colors.primary,
    business: colors.warning,
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setCreating(true);
    try {
      await createWorkspace(workspaceName.trim(), 'personal');
      setWorkspaceName('');
      setShowNewWorkspace(false);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleUpgradePro = async () => {
    Alert.alert('Upgrade to Pro', 'Unlock 1,000 items, 100 AI scans/month, and 5 workspaces.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upgrade ($9.99/mo)', onPress: async () => {
        const success = await purchasePro();
        if (success) Alert.alert('Welcome to Pro!', 'Your account has been upgraded.');
      }},
    ]);
  };

  const handleUpgradeBusiness = async () => {
    Alert.alert('Upgrade to Business', 'Unlock 50,000 items, 10,000 AI scans, and 20 workspaces.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Upgrade ($29.99/mo)', onPress: async () => {
        const success = await purchaseBusiness();
        if (success) Alert.alert('Welcome to Business!', 'Your account has been upgraded.');
      }},
    ]);
  };

  const themeModes: { label: string; value: 'light' | 'dark' | 'system' }[] = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'System', value: 'system' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.full_name ?? 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>
        <View style={styles.tierDot}>
          <View style={[styles.tierDotInner, { backgroundColor: tierColors[tier] }]} />
          <Text style={[styles.tierLabel, { color: colors.textSecondary }]}>{tier.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.body}>
        {/* Subscription */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUBSCRIPTION</Text>
        <Card style={styles.planCard} variant="elevated" padding={14}>
          <View style={styles.planHeader}>
            <View style={styles.planNameRow}>
              <Ionicons
                name={tier === 'free' ? 'shield-outline' : tier === 'pro' ? 'star' : 'business'}
                size={16}
                color={tierColors[tier]}
                style={styles.planNameIcon}
              />
              <Text style={[styles.planName, { color: colors.textPrimary }]}>
                {tier === 'free' ? 'Free Plan' : tier === 'pro' ? 'Pro Plan' : 'Business Plan'}
              </Text>
            </View>
            {tier === 'free' && (
              <Button title="Upgrade" onPress={() => setShowUpgrade(true)} size="sm" />
            )}
          </View>
          <View style={styles.planLimits}>
            <LimitRow iconName="cube" label="Items" value={`${limits.max_items.toLocaleString()} max`} colors={colors} />
            <LimitRow iconName="flash" label="AI scans/mo" value={`${limits.ai_requests_per_month} max`} colors={colors} />
            <LimitRow iconName="business" label="Workspaces" value={`${limits.max_workspaces} max`} colors={colors} />
          </View>
        </Card>

        {tier !== 'business' && (
          <View style={styles.upgradeRow}>
            {tier === 'free' && (
              <Button
                title="Upgrade to Pro — $9.99/mo"
                onPress={handleUpgradePro}
                fullWidth
                style={{ marginBottom: 8 }}
              />
            )}
            <Button
              title="Upgrade to Business — $29.99/mo"
              onPress={handleUpgradeBusiness}
              variant="secondary"
              fullWidth
            />
            <TouchableOpacity style={styles.restoreBtn} onPress={restorePurchases}>
              <Text style={[styles.restoreText, { color: colors.primary }]}>Restore Purchases</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Usage Dashboard */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>USAGE</Text>
        <UsageDashboard
          tier={tier}
          usage={currentUsage}
          limits={limits}
        />

        {/* Workspaces */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WORKSPACES</Text>
        {workspaces.map(ws => (
          <TouchableOpacity
            key={ws.id}
            style={[
              styles.workspaceRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
              activeWorkspace?.id === ws.id && { borderColor: colors.primary, borderWidth: 1 },
            ]}
            onPress={() => switchWorkspace(ws)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={
                ws.workspace_type === 'business' ? 'business' :
                ws.workspace_type === 'family' ? 'people' : 'home'
              }
              size={20}
              color={colors.textSecondary}
              style={styles.workspaceIcon}
            />
            <View style={styles.workspaceInfo}>
              <Text style={[styles.workspaceName, { color: colors.textPrimary }]}>{ws.name}</Text>
              <Text style={[styles.workspaceType, { color: colors.textTertiary }]}>{ws.workspace_type}</Text>
            </View>
            {activeWorkspace?.id === ws.id && (
              <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginRight: 8 }} />
            )}
            <TouchableOpacity
              onPress={() => router.push(`/workspace/members?id=${ws.id}&name=${encodeURIComponent(ws.name)}`)}
              style={styles.membersBtn}
              hitSlop={8}
            >
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <Button
          title="+ New Workspace"
          onPress={() => setShowNewWorkspace(true)}
          variant="outline"
          fullWidth
          style={styles.newWorkspaceBtn}
        />

        {/* Account Settings */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ACCOUNT</Text>

        {/* Appearance / Dark Mode Toggle */}
        <View style={[styles.themeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeHeader}>
            <Ionicons
              name={theme === 'dark' ? 'moon' : 'sunny'}
              size={18}
              color={colors.textSecondary}
              style={styles.themeIcon}
            />
            <Text style={[styles.themeLabel, { color: colors.textPrimary }]}>Appearance</Text>
          </View>
          <View style={styles.themeChips}>
            {themeModes.map(mode => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.themeChip,
                  { borderColor: colors.border, backgroundColor: colors.gray200 },
                  theme === mode.value && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setTheme(mode.value)}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    { color: colors.textSecondary },
                    theme === mode.value && { color: '#FFFFFF', fontWeight: '700' },
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
          {([
            { iconName: 'notifications', label: 'Notifications', onPress: () => router.push('/settings/notifications') },
            { iconName: 'build', label: 'Maintenance Schedule', onPress: () => router.push('/settings/maintenance') },
            { iconName: 'color-palette', label: 'Categories', onPress: () => router.push('/settings/categories') },
            { iconName: 'lock-closed', label: 'Privacy & Security', onPress: () => Alert.alert('Coming Soon', 'Privacy & Security settings will be available in a future update.') },
            { iconName: 'bar-chart', label: 'Export Data', onPress: () => router.push('/settings/export') },
            { iconName: 'help-circle', label: 'Help & Support', onPress: () => router.push('/settings/help') },
            { iconName: 'star', label: 'Rate the App', onPress: () => Alert.alert('Rate InventoryEver', 'Thank you for using InventoryEver! Rating support will be available when the app is published.') },
          ] as { iconName: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void }[]).map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.settingsRow,
                i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
            >
              <Ionicons name={item.iconName} size={18} color={colors.textSecondary} style={styles.settingsIcon} />
              <Text style={[styles.settingsLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          fullWidth
          style={styles.signOutBtn}
        />

        <Text style={[styles.version, { color: colors.textTertiary }]}>InventoryEver v1.0.0</Text>
      </View>

      {/* New Workspace Modal */}
      <Modal
        visible={showNewWorkspace}
        onClose={() => setShowNewWorkspace(false)}
        title="New Workspace"
      >
        <Input
          label="Workspace Name"
          placeholder="e.g. Home, Office, Storage Unit"
          value={workspaceName}
          onChangeText={setWorkspaceName}
          autoFocus
        />
        <Button
          title="Create Workspace"
          onPress={handleCreateWorkspace}
          loading={creating}
          disabled={!workspaceName.trim()}
          fullWidth
        />
      </Modal>

      {/* Upgrade Modal */}
      <Modal visible={showUpgrade} onClose={() => setShowUpgrade(false)} title="Upgrade Plan">
        <UpgradeModal
          onPro={() => { setShowUpgrade(false); handleUpgradePro(); }}
          onBusiness={() => { setShowUpgrade(false); handleUpgradeBusiness(); }}
          colors={colors}
        />
      </Modal>
    </ScrollView>
  );
}

function LimitRow({ iconName, label, value, colors }: { iconName: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; colors: any }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
      <Ionicons name={iconName} size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
      <Text style={{ fontSize: 13, color: colors.textSecondary, flex: 1 }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textPrimary, fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function UpgradeModal({ onPro, onBusiness, colors }: { onPro: () => void; onBusiness: () => void; colors: any }) {
  const plans: { tier: string; price: string; color: string; iconName: React.ComponentProps<typeof Ionicons>['name']; features: string[]; onPress: () => void }[] = [
    {
      tier: 'Pro',
      price: '$9.99/mo',
      color: colors.primary,
      iconName: 'star',
      features: ['1,000 items', '100 AI scans/month', '3 workspaces', '5 GB storage'],
      onPress: onPro,
    },
    {
      tier: 'Business',
      price: '$29.99/mo',
      color: colors.warning,
      iconName: 'business',
      features: ['50,000 items', '10,000 AI scans/month', '20 workspaces', '100 GB storage'],
      onPress: onBusiness,
    },
  ];
  return (
    <View>
      {plans.map(plan => (
        <View key={plan.tier} style={{
          marginBottom: 10,
          padding: 14,
          backgroundColor: colors.surface,
          borderRadius: 6,
          borderWidth: 1,
          borderColor: colors.border,
          borderLeftWidth: 3,
          borderLeftColor: plan.color,
        }}>
          <Ionicons name={plan.iconName} size={20} color={plan.color} style={{ marginBottom: 4 }} />
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>{plan.tier}</Text>
          <Text style={{ fontSize: 14, color: plan.color, fontWeight: '700', marginBottom: 8 }}>{plan.price}</Text>
          {plan.features.map(f => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
              <Ionicons name="checkmark" size={13} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>{f}</Text>
            </View>
          ))}
          <Button title={`Get ${plan.tier}`} onPress={plan.onPress} fullWidth style={{ marginTop: 10 }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#252836',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 22, color: '#FFFFFF', fontWeight: '700' },
  headerInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '800' },
  userEmail: { fontSize: 12, marginTop: 2 },
  tierDot: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tierDotInner: { width: 8, height: 8, borderRadius: 4 },
  tierLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
  body: { padding: 16 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 12,
    letterSpacing: 1.5,
  },
  planCard: { marginBottom: 10, borderRadius: 6 },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  planNameRow: { flexDirection: 'row', alignItems: 'center' },
  planNameIcon: { marginRight: 6 },
  planName: { fontSize: 14, fontWeight: '700' },
  planLimits: {},
  upgradeRow: { marginBottom: 20 },
  restoreBtn: { alignItems: 'center', marginTop: 10 },
  restoreText: { fontSize: 12, fontWeight: '500' },
  workspaceRow: {
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  workspaceIcon: { marginRight: 10 },
  workspaceInfo: { flex: 1 },
  workspaceName: { fontSize: 14, fontWeight: '600' },
  workspaceType: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  membersBtn: { padding: 4 },
  newWorkspaceBtn: { marginBottom: 20 },
  themeCard: {
    marginBottom: 10,
    padding: 14,
    borderRadius: 6,
    borderWidth: 1,
  },
  themeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  themeIcon: { marginRight: 8 },
  themeLabel: { fontSize: 14, fontWeight: '600' },
  themeChips: { flexDirection: 'row', gap: 8 },
  themeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 4,
    borderWidth: 1,
  },
  themeChipText: { fontSize: 12, fontWeight: '600' },
  settingsCard: {
    marginBottom: 14,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#252836',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  settingsIcon: { marginRight: 10 },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  signOutBtn: { marginBottom: 14 },
  version: { textAlign: 'center', fontSize: 11, marginBottom: 32 },
});
