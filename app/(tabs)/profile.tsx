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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const insets = useSafeAreaInsets();
  const { user, profile, signOut, deleteAccount } = useAuthContext();
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'This Cannot Be Undone',
              'All your data — items, workspaces, images — will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAccount();
                      router.replace('/(auth)/sign-in');
                    } catch (err) {
                      Alert.alert(
                        'Error',
                        err instanceof Error ? err.message : 'Failed to delete account. Please try again.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
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
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border, paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => router.push('/settings/edit-profile')}
          activeOpacity={0.8}
          style={styles.avatarBtn}
        >
          {profile?.avatar_url ? (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Image
                source={{ uri: profile.avatar_url }}
                style={{ width: 48, height: 48, borderRadius: 8 }}
              />
            </View>
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0)?.toUpperCase() ?? user?.email?.charAt(0)?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{profile?.full_name ?? 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{user?.email}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/settings/edit-profile')}
          style={[styles.editBtn, { backgroundColor: colors.gray200 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Edit Profile"
        >
          <Ionicons name="pencil" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
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

        <TouchableOpacity
          style={[styles.joinWorkspaceBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push('/workspace/join')}
          activeOpacity={0.75}
        >
          <Ionicons name="enter-outline" size={18} color={colors.primary} style={styles.workspaceIcon} />
          <Text style={[styles.joinWorkspaceBtnText, { color: colors.primary }]}>Join a Workspace</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </TouchableOpacity>

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

        <View style={[styles.settingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {([
            { iconName: 'notifications', label: 'Notifications', onPress: () => router.push('/settings/notifications') },
            { iconName: 'hand-left', label: 'Lending Tracker', onPress: () => router.push('/lending') },
            { iconName: 'location', label: 'Locations', onPress: () => router.push('/locations') },
            { iconName: 'qr-code', label: 'QR / Labels', onPress: () => router.push('/labels') },
            { iconName: 'build', label: 'Maintenance Schedule', onPress: () => router.push('/settings/maintenance') },
            { iconName: 'color-palette', label: 'Categories', onPress: () => router.push('/settings/categories') },
            { iconName: 'lock-closed', label: 'Privacy Policy', onPress: () => router.push('/settings/privacy-policy') },
            { iconName: 'document-text', label: 'Terms of Service', onPress: () => router.push('/settings/terms') },
            { iconName: 'albums', label: 'Collections', onPress: () => router.push('/collections') },
            { iconName: 'trending-down', label: 'Depreciation', onPress: () => router.push('/settings/depreciation') },
            { iconName: 'shield-checkmark', label: 'Insurance Report', onPress: () => router.push('/settings/insurance') },
            { iconName: 'bar-chart', label: 'Analytics & Reports', onPress: () => router.push('/analytics') },
            { iconName: 'download-outline', label: 'Export Data', onPress: () => router.push('/settings/export') },
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

        {/* Danger Zone */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DANGER ZONE</Text>
        <View style={[styles.dangerZone, { borderColor: colors.error + '44', backgroundColor: colors.error + '08' }]}>
          <Text style={[styles.dangerZoneDesc, { color: colors.textSecondary }]}>
            Permanently delete your account and all associated data. This action cannot be undone.
          </Text>
          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="danger"
            fullWidth
            style={{ marginTop: 12 }}
          />
        </View>

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

const FEATURE_ROWS = [
  { label: 'Items', free: '50', pro: '1,000', business: '50,000' },
  { label: 'AI Scans / month', free: '5', pro: '100', business: '10,000' },
  { label: 'Workspaces', free: '1', pro: '3', business: '20' },
  { label: 'Storage', free: '500 MB', pro: '5 GB', business: '100 GB' },
  { label: 'Team members', free: '—', pro: '5', business: 'Unlimited' },
  { label: 'Analytics & Reports', free: '—', pro: '✓', business: '✓' },
  { label: 'Barcode Scanner', free: '✓', pro: '✓', business: '✓' },
  { label: 'Warranty Alerts', free: '✓', pro: '✓', business: '✓' },
  { label: 'Lending Tracker', free: '—', pro: '✓', business: '✓' },
  { label: 'Insurance Reports', free: '—', pro: '✓', business: '✓' },
  { label: 'Depreciation Calc', free: '—', pro: '✓', business: '✓' },
  { label: 'Data Export', free: '—', pro: '✓', business: '✓' },
  { label: 'Priority Support', free: '—', pro: '—', business: '✓' },
];

function UpgradeModal({ onPro, onBusiness, colors }: { onPro: () => void; onBusiness: () => void; colors: any }) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const yearlyDiscount = 0.17; // ~2 months free

  const proMonthly = 9.99;
  const businessMonthly = 29.99;
  const proPrice = billing === 'yearly'
    ? `$${(proMonthly * 12 * (1 - yearlyDiscount) / 12).toFixed(2)}/mo`
    : `$${proMonthly}/mo`;
  const businessPrice = billing === 'yearly'
    ? `$${(businessMonthly * 12 * (1 - yearlyDiscount) / 12).toFixed(2)}/mo`
    : `$${businessMonthly}/mo`;

  return (
    <View>
      {/* Billing toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.gray100, borderRadius: 8, padding: 3, marginBottom: 20 }}>
        {(['monthly', 'yearly'] as const).map(b => (
          <TouchableOpacity
            key={b}
            style={[
              { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
              billing === b && { backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
            ]}
            onPress={() => setBilling(b)}
          >
            <Text style={{ fontSize: 13, fontWeight: billing === b ? '700' : '500', color: billing === b ? colors.textPrimary : colors.textSecondary }}>
              {b === 'monthly' ? 'Monthly' : 'Yearly  17% off'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Pro card */}
      <View style={{ borderRadius: 12, borderWidth: 2, borderColor: colors.primary, overflow: 'hidden', marginBottom: 12 }}>
        {/* Most popular badge */}
        <View style={{ backgroundColor: colors.primary, paddingVertical: 6, alignItems: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.white, letterSpacing: 1.5 }}>RECOMMENDED</Text>
        </View>
        <View style={{ padding: 16, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="star" size={20} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>Pro</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.primary, marginBottom: 4 }}>{proPrice}</Text>
          {billing === 'yearly' && (
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 8 }}>billed ${(proMonthly * 12 * (1 - yearlyDiscount)).toFixed(0)}/year</Text>
          )}
          <Button title="Start Pro Free Trial" onPress={onPro} fullWidth style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* Business card */}
      <View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: 20 }}>
        <View style={{ padding: 16, backgroundColor: colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <Ionicons name="business" size={20} color={colors.warning} style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.textPrimary }}>Business</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.warning, marginBottom: 4 }}>{businessPrice}</Text>
          {billing === 'yearly' && (
            <Text style={{ fontSize: 11, color: colors.textTertiary, marginBottom: 8 }}>billed ${(businessMonthly * 12 * (1 - yearlyDiscount)).toFixed(0)}/year</Text>
          )}
          <Button title="Get Business" onPress={onBusiness} variant="secondary" fullWidth style={{ marginTop: 8 }} />
        </View>
      </View>

      {/* Feature comparison table */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: colors.textTertiary, letterSpacing: 1, marginBottom: 10 }}>FEATURE COMPARISON</Text>
      <View style={{ borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', backgroundColor: colors.gray100, paddingVertical: 8, paddingHorizontal: 12 }}>
          <Text style={{ flex: 2, fontSize: 11, fontWeight: '700', color: colors.textTertiary }}>FEATURE</Text>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.textTertiary, textAlign: 'center' }}>FREE</Text>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.primary, textAlign: 'center' }}>PRO</Text>
          <Text style={{ flex: 1, fontSize: 11, fontWeight: '700', color: colors.warning, textAlign: 'center' }}>BIZ</Text>
        </View>
        {FEATURE_ROWS.map((row, i) => (
          <View key={row.label} style={[
            { flexDirection: 'row', paddingVertical: 9, paddingHorizontal: 12, alignItems: 'center' },
            i % 2 === 0 && { backgroundColor: colors.gray50 },
          ]}>
            <Text style={{ flex: 2, fontSize: 12, color: colors.textSecondary }}>{row.label}</Text>
            <Text style={{ flex: 1, fontSize: 12, color: row.free === '—' ? colors.textTertiary : colors.textSecondary, textAlign: 'center' }}>{row.free}</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: row.pro === '—' ? colors.textTertiary : colors.primary, textAlign: 'center' }}>{row.pro}</Text>
            <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: row.business === '—' ? colors.textTertiary : colors.warning, textAlign: 'center' }}>{row.business}</Text>
          </View>
        ))}
      </View>

      <Text style={{ fontSize: 11, color: colors.textTertiary, textAlign: 'center', marginTop: 16, lineHeight: 16 }}>
        Cancel anytime · Prices in USD · Billed through App Store / Google Play
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
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
  newWorkspaceBtn: { marginBottom: 8 },
  joinWorkspaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 20,
  },
  joinWorkspaceBtnText: { flex: 1, fontSize: 14, fontWeight: '600' },
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
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settingsIcon: { marginRight: 10 },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  signOutBtn: { marginBottom: 14 },
  avatarBtn: {},
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZone: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 14,
    marginBottom: 16,
  },
  dangerZoneDesc: {
    fontSize: 13,
    lineHeight: 19,
  },
  version: { textAlign: 'center', fontSize: 11, marginBottom: 32 },
});
