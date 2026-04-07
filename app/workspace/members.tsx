import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MemberCard, MemberWithProfile } from '../../components/workspace/MemberCard';
import { useColors } from '../../hooks/useColors';

type Role = 'admin' | 'editor' | 'viewer';

const INVITE_ROLES: Role[] = ['admin', 'editor', 'viewer'];

interface WorkspaceMemberRow {
  id: string;
  user_id: string;
  role: string;
  profiles: { full_name: string | null; email: string } | { full_name: string | null; email: string }[] | null;
}

export default function MembersScreen() {
  const { id: workspaceId, name: workspaceName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const { user } = useAuthContext();
  const colors = useColors();
  const router = useRouter();

  const ROLE_COLORS: Record<Role, string> = {
    admin: '#8B5CF6',
    editor: colors.info,
    viewer: colors.gray400,
  };

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('viewer');
  const [inviting, setInviting] = useState(false);

  const currentMember = members.find(m => m.user_id === user?.id);
  const currentUserRole = currentMember?.role ?? 'viewer';
  const isCurrentUserOwnerOrAdmin =
    currentUserRole === 'owner' || currentUserRole === 'admin';

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('id, user_id, role, profiles(full_name, email)')
        .eq('workspace_id', workspaceId)
        .order('role', { ascending: true });

      if (error) throw error;

      const mapped: MemberWithProfile[] = (data as unknown as WorkspaceMemberRow[]).map(row => {
        const prof = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.id,
          user_id: row.user_id,
          role: row.role,
          profile: prof
            ? { full_name: prof.full_name ?? '', email: prof.email }
            : null,
        };
      });

      setMembers(mapped);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to load members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !workspaceId) return;

    setInviting(true);
    try {
      // Look up profile by email
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (profileError || !profileData) {
        Alert.alert(
          'User Not Found',
          'User not found. They need to sign up first.'
        );
        return;
      }

      // Check if already a member
      const alreadyMember = members.some(m => m.user_id === profileData.id);
      if (alreadyMember) {
        Alert.alert('Already a Member', 'This user is already a member of this workspace.');
        return;
      }

      const { error: insertError } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: profileData.id,
        role: selectedRole,
        joined_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setInviteEmail('');
      await fetchMembers();
      Alert.alert('Success', `${profileData.full_name ?? email} has been added to the workspace.`);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      await fetchMembers();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: workspaceName ? `${workspaceName} Members` : 'Members',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />

      <FlatList
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        data={members}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {isCurrentUserOwnerOrAdmin && (
              <View style={[styles.inviteSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.inviteHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Invite Member</Text>
                  <TouchableOpacity
                    style={[styles.inviteLinkBtn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
                    onPress={() =>
                      router.push(
                        `/workspace/invite?id=${workspaceId}&name=${encodeURIComponent(workspaceName ?? '')}`
                      )
                    }
                    activeOpacity={0.75}
                  >
                    <Ionicons name="link-outline" size={15} color={colors.primary} />
                    <Text style={[styles.inviteLinkText, { color: colors.primary }]}>Share Invite Link</Text>
                  </TouchableOpacity>
                </View>
                <Input
                  label="Email Address"
                  placeholder="Enter email to invite"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  icon="mail-outline"
                />

                <Text style={[styles.roleLabel, { color: colors.textPrimary }]}>Role</Text>
                <View style={styles.roleChips}>
                  {INVITE_ROLES.map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        { borderColor: colors.border, backgroundColor: colors.gray50 },
                        selectedRole === role && { backgroundColor: ROLE_COLORS[role] },
                      ]}
                      onPress={() => setSelectedRole(role)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
                          { color: colors.textSecondary },
                          selectedRole === role && styles.roleChipTextActive,
                        ]}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Button
                  title="Send Invite"
                  onPress={handleInvite}
                  loading={inviting}
                  disabled={!inviteEmail.trim()}
                  fullWidth
                  style={styles.inviteBtn}
                />
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {loading ? 'Members' : `Members (${members.length})`}
            </Text>

            {loading && (
              <ActivityIndicator
                color={colors.primary}
                size="large"
                style={styles.spinner}
              />
            )}
          </>
        }
        renderItem={({ item }) => (
          <MemberCard
            member={item}
            isCurrentUserOwnerOrAdmin={isCurrentUserOwnerOrAdmin}
            onChangeRole={handleChangeRole}
            onRemove={handleRemove}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.gray300} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No other members yet. Invite someone to collaborate!
              </Text>
            </View>
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  inviteSection: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inviteLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  inviteLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: '#ffffff',
  },
  inviteBtn: {
    marginTop: 4,
  },
  spinner: {
    marginVertical: 32,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
