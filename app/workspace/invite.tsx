import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useColors } from '../../hooks/useColors';

type ExpiryOption = { label: string; hours: number };
type InviteRole = 'admin' | 'editor' | 'viewer';

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { label: '24 hours', hours: 24 },
  { label: '7 days', hours: 24 * 7 },
  { label: '30 days', hours: 24 * 30 },
];

const INVITE_ROLES: InviteRole[] = ['admin', 'editor', 'viewer'];

interface WorkspaceInvite {
  id: string;
  code: string;
  role: InviteRole;
  expires_at: string;
  use_count: number;
  max_uses: number | null;
  created_at: string;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

function formatExpiry(expiresAt: string): string {
  const exp = new Date(expiresAt);
  const now = new Date();
  if (exp < now) return 'Expired';
  const diff = exp.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 24) return `Expires in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Expires in ${days}d`;
}

export default function InviteScreen() {
  const { id: workspaceId, name: workspaceName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const { user } = useAuthContext();
  const colors = useColors();

  const ROLE_COLORS: Record<InviteRole, string> = {
    admin: '#8B5CF6',
    editor: colors.info,
    viewer: colors.gray400,
  };

  const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedRole, setSelectedRole] = useState<InviteRole>('viewer');
  const [selectedExpiry, setSelectedExpiry] = useState<ExpiryOption>(EXPIRY_OPTIONS[1]);

  const fetchInvites = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_invites')
        .select('id, code, role, expires_at, use_count, max_uses, created_at')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data as WorkspaceInvite[]) ?? []);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  const handleGenerate = async () => {
    if (!workspaceId || !user) return;
    setGenerating(true);
    try {
      const code = generateCode();
      const expiresAt = new Date(
        Date.now() + selectedExpiry.hours * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase.from('workspace_invites').insert({
        workspace_id: workspaceId,
        code,
        role: selectedRole,
        created_by: user.id,
        expires_at: expiresAt,
        use_count: 0,
        max_uses: null,
      });

      if (error) throw error;
      await fetchInvites();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to generate invite');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (code: string) => {
    Clipboard.setString(code);
    Alert.alert('Copied', `Invite code ${code} copied to clipboard.`);
  };

  const handleShare = async (code: string) => {
    try {
      await Share.share({
        message: `Join my workspace "${workspaceName ?? 'workspace'}" on InventoryEver!\n\nUse invite code: ${code}\n\nOpen the app and tap Profile → Join a Workspace.`,
        title: 'Join my InventoryEver workspace',
      });
    } catch (err) {
      // User cancelled or error — suppress
    }
  };

  const handleRevoke = (inviteId: string, code: string) => {
    Alert.alert('Revoke Invite', `Revoke code ${code}? It will no longer work.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Revoke',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase
              .from('workspace_invites')
              .delete()
              .eq('id', inviteId);
            if (error) throw error;
            await fetchInvites();
          } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to revoke invite');
          }
        },
      },
    ]);
  };

  const activeInvites = invites.filter(inv => !isExpired(inv.expires_at));
  const expiredInvites = invites.filter(inv => isExpired(inv.expires_at));

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Invite via Code',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Generator Card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Generate Invite Code</Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
            Anyone with the code can join this workspace.
          </Text>

          {/* Role selector */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Role</Text>
          <View style={styles.chips}>
            {INVITE_ROLES.map(role => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.gray50 },
                  selectedRole === role && { backgroundColor: ROLE_COLORS[role], borderColor: ROLE_COLORS[role] },
                ]}
                onPress={() => setSelectedRole(role)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    selectedRole === role && styles.chipTextActive,
                  ]}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Expiry selector */}
          <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Expires after</Text>
          <View style={styles.chips}>
            {EXPIRY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.hours}
                style={[
                  styles.chip,
                  { borderColor: colors.border, backgroundColor: colors.gray50 },
                  selectedExpiry.hours === opt.hours && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setSelectedExpiry(opt)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: colors.textSecondary },
                    selectedExpiry.hours === opt.hours && styles.chipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title="Generate Code"
            onPress={handleGenerate}
            loading={generating}
            fullWidth
            icon="add-circle-outline"
            style={styles.generateBtn}
          />
        </View>

        {/* Active Invites */}
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={styles.spinner} />
        ) : (
          <>
            {activeInvites.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  ACTIVE CODES ({activeInvites.length})
                </Text>
                {activeInvites.map(invite => (
                  <InviteCodeCard
                    key={invite.id}
                    invite={invite}
                    colors={colors}
                    roleColor={ROLE_COLORS[invite.role as InviteRole] ?? colors.gray400}
                    onCopy={() => handleCopy(invite.code)}
                    onShare={() => handleShare(invite.code)}
                    onRevoke={() => handleRevoke(invite.id, invite.code)}
                  />
                ))}
              </>
            ) : (
              <EmptyState
                icon="🔗"
                title="No invite codes yet"
                description="Generate one above to invite team members to this workspace."
              />
            )}

            {expiredInvites.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  EXPIRED CODES ({expiredInvites.length})
                </Text>
                {expiredInvites.map(invite => (
                  <InviteCodeCard
                    key={invite.id}
                    invite={invite}
                    colors={colors}
                    roleColor={colors.gray400}
                    onCopy={() => handleCopy(invite.code)}
                    onShare={() => handleShare(invite.code)}
                    onRevoke={() => handleRevoke(invite.id, invite.code)}
                    expired
                  />
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

interface InviteCodeCardProps {
  invite: WorkspaceInvite;
  colors: ReturnType<typeof useColors>;
  roleColor: string;
  onCopy: () => void;
  onShare: () => void;
  onRevoke: () => void;
  expired?: boolean;
}

function InviteCodeCard({ invite, colors, roleColor, onCopy, onShare, onRevoke, expired }: InviteCodeCardProps) {
  return (
    <View
      style={[
        styles.inviteCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
        expired && { opacity: 0.55 },
      ]}
    >
      {/* Code display */}
      <View style={styles.codeRow}>
        <Text style={[styles.code, { color: colors.textPrimary, letterSpacing: 6 }]}>
          {invite.code}
        </Text>
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor }]}>
          <Text style={[styles.roleBadgeText, { color: roleColor }]}>
            {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
          </Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <Ionicons
          name={expired ? 'time-outline' : 'checkmark-circle-outline'}
          size={13}
          color={expired ? colors.error : colors.success}
          style={{ marginRight: 4 }}
        />
        <Text style={[styles.metaText, { color: expired ? colors.error : colors.textTertiary }]}>
          {formatExpiry(invite.expires_at)}
        </Text>
        <Text style={[styles.metaDot, { color: colors.textTertiary }]}> · </Text>
        <Text style={[styles.metaText, { color: colors.textTertiary }]}>
          Used {invite.use_count}×
        </Text>
      </View>

      {/* Actions */}
      {!expired && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.gray100, borderColor: colors.border }]}
            onPress={onCopy}
            activeOpacity={0.75}
          >
            <Ionicons name="copy-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.gray100, borderColor: colors.border }]}
            onPress={onShare}
            activeOpacity={0.75}
          >
            <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.error + '12', borderColor: colors.error + '44' }]}
            onPress={onRevoke}
            activeOpacity={0.75}
          >
            <Ionicons name="trash-outline" size={16} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Revoke</Text>
          </TouchableOpacity>
        </View>
      )}

      {expired && (
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.gray100, borderColor: colors.border, alignSelf: 'flex-start' }]}
          onPress={onRevoke}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
          <Text style={[styles.actionBtnText, { color: colors.textTertiary }]}>Delete</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  generateBtn: { marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },
  inviteCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  code: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  roleBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  metaText: { fontSize: 12 },
  metaDot: { fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  spinner: { marginVertical: 32 },
});
