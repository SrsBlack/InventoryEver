import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Badge } from '../ui/Badge';
import { Colors } from '../../constants/colors';

export interface MemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  profile: { full_name: string; email: string } | null;
}

interface MemberCardProps {
  member: MemberWithProfile;
  isCurrentUserOwnerOrAdmin: boolean;
  onChangeRole: (memberId: string, newRole: string) => void;
  onRemove: (memberId: string) => void;
}

const ROLE_COLORS: Record<string, string> = {
  owner: Colors.warning,
  admin: '#8B5CF6',
  editor: Colors.info,
  viewer: Colors.gray500,
};

const AVATAR_COLORS: Record<string, string> = {
  owner: Colors.warning,
  admin: '#8B5CF6',
  editor: Colors.info,
  viewer: Colors.gray400,
};

const ROLES = ['admin', 'editor', 'viewer'] as const;

export function MemberCard({
  member,
  isCurrentUserOwnerOrAdmin,
  onChangeRole,
  onRemove,
}: MemberCardProps) {
  const displayName = member.profile?.full_name || member.profile?.email || 'Unknown User';
  const email = member.profile?.email || '';
  const initial = displayName.charAt(0).toUpperCase();
  const avatarColor = AVATAR_COLORS[member.role] ?? Colors.gray400;
  const roleBadgeColor = ROLE_COLORS[member.role] ?? Colors.gray500;
  const isOwner = member.role === 'owner';
  const canAct = isCurrentUserOwnerOrAdmin && !isOwner;

  const handleActions = () => {
    Alert.alert(
      displayName,
      `Current role: ${member.role}`,
      [
        ...ROLES.filter(r => r !== member.role).map(r => ({
          text: `Change to ${r.charAt(0).toUpperCase() + r.slice(1)}`,
          onPress: () => onChangeRole(member.id, r),
        })),
        {
          text: 'Remove Member',
          style: 'destructive' as const,
          onPress: () => {
            Alert.alert(
              'Remove Member',
              `Remove ${displayName} from this workspace?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => onRemove(member.id) },
              ]
            );
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        {email ? <Text style={styles.email} numberOfLines={1}>{email}</Text> : null}
        <Badge
          label={member.role.toUpperCase()}
          backgroundColor={roleBadgeColor}
          size="sm"
          style={styles.badge}
        />
      </View>

      {canAct ? (
        <TouchableOpacity onPress={handleActions} style={styles.actionBtn} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      ) : isOwner ? (
        <View style={styles.ownerTag}>
          <Ionicons name="shield-checkmark" size={16} color={Colors.warning} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  email: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  badge: {
    marginTop: 2,
  },
  actionBtn: {
    padding: 6,
    marginLeft: 8,
  },
  ownerTag: {
    padding: 6,
    marginLeft: 8,
  },
});
