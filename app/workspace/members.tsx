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
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { MemberCard, MemberWithProfile } from '../../components/workspace/MemberCard';
import { Colors } from '../../constants/colors';

type Role = 'admin' | 'editor' | 'viewer';

const INVITE_ROLES: Role[] = ['admin', 'editor', 'viewer'];

const ROLE_COLORS: Record<Role, string> = {
  admin: '#8B5CF6',
  editor: Colors.info,
  viewer: Colors.gray400,
};

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
          headerStyle: { backgroundColor: Colors.background },
          headerTitleStyle: { fontWeight: '700', color: Colors.textPrimary },
        }}
      />

      <FlatList
        style={styles.container}
        contentContainerStyle={styles.content}
        data={members}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {isCurrentUserOwnerOrAdmin && (
              <View style={styles.inviteSection}>
                <Text style={styles.sectionTitle}>Invite Member</Text>
                <Input
                  label="Email Address"
                  placeholder="Enter email to invite"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  icon="mail-outline"
                />

                <Text style={styles.roleLabel}>Role</Text>
                <View style={styles.roleChips}>
                  {INVITE_ROLES.map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleChip,
                        selectedRole === role && { backgroundColor: ROLE_COLORS[role] },
                      ]}
                      onPress={() => setSelectedRole(role)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.roleChipText,
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

            <Text style={styles.sectionTitle}>
              {loading ? 'Members' : `Members (${members.length})`}
            </Text>

            {loading && (
              <ActivityIndicator
                color={Colors.primary}
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
              <Ionicons name="people-outline" size={48} color={Colors.gray300} />
              <Text style={styles.emptyText}>
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
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  inviteSection: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
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
    borderColor: Colors.border,
    backgroundColor: Colors.gray50,
  },
  roleChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleChipTextActive: {
    color: Colors.white,
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
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 20,
  },
});
