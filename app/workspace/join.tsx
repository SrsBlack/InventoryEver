import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuthContext } from '../../contexts/AuthContext';
import { useWorkspaceContext } from '../../contexts/WorkspaceContext';
import { Button } from '../../components/ui/Button';
import { useColors } from '../../hooks/useColors';

const CODE_LENGTH = 6;

export default function JoinWorkspaceScreen() {
  const router = useRouter();
  const { user } = useAuthContext();
  const { fetchWorkspaces } = useWorkspaceContext();
  const colors = useColors();

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleCodeChange = (text: string) => {
    // Uppercase, strip non-alphanumeric, cap at CODE_LENGTH
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
  };

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== CODE_LENGTH) {
      Alert.alert('Invalid Code', `Please enter the full ${CODE_LENGTH}-character invite code.`);
      return;
    }
    if (!user) return;

    setJoining(true);
    try {
      // 1. Look up the invite code
      const { data: invite, error: lookupError } = await supabase
        .from('workspace_invites')
        .select('id, workspace_id, role, expires_at, use_count, max_uses')
        .eq('code', trimmed)
        .single();

      if (lookupError || !invite) {
        Alert.alert('Not Found', 'That invite code does not exist. Please check and try again.');
        return;
      }

      // 2. Check expiry
      if (new Date(invite.expires_at) < new Date()) {
        Alert.alert('Code Expired', 'This invite code has expired. Ask your workspace admin for a new one.');
        return;
      }

      // 3. Check max uses
      if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
        Alert.alert('Code Used Up', 'This invite code has reached its maximum number of uses.');
        return;
      }

      // 4. Check if already a member
      const { data: existing } = await supabase
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', invite.workspace_id)
        .eq('user_id', user.id)
        .single();

      if (existing) {
        Alert.alert('Already a Member', 'You are already a member of this workspace.');
        return;
      }

      // 5. Insert workspace membership
      const { error: insertError } = await supabase.from('workspace_members').insert({
        workspace_id: invite.workspace_id,
        user_id: user.id,
        role: invite.role,
        joined_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      // 6. Increment use_count
      await supabase
        .from('workspace_invites')
        .update({ use_count: invite.use_count + 1 })
        .eq('id', invite.id);

      // 7. Refresh workspaces and navigate back
      await fetchWorkspaces();

      Alert.alert(
        'Joined!',
        'You have successfully joined the workspace.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to join workspace');
    } finally {
      setJoining(false);
    }
  };

  const displayCode = code.padEnd(CODE_LENGTH, ' ');

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Join a Workspace',
          headerStyle: { backgroundColor: colors.background },
          headerTitleStyle: { fontWeight: '700', color: colors.textPrimary },
        }}
      />

      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero */}
          <View style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="people-circle-outline" size={52} color={colors.primary} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Join a Workspace</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Enter the 6-character invite code shared by your workspace admin.
            </Text>
          </View>

          {/* Code input area */}
          <View style={[styles.codeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {/* Invisible real input */}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={CODE_LENGTH}
              style={styles.hiddenInput}
              keyboardType="default"
              returnKeyType="done"
              onSubmitEditing={handleJoin}
              accessibilityLabel="Invite code input"
            />

            {/* Visual code boxes */}
            <Text style={[styles.codeInputLabel, { color: colors.textSecondary }]}>
              INVITE CODE
            </Text>
            <View style={styles.codeBoxRow} accessibilityRole="none">
              {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                const char = code[i] ?? '';
                const isActive = i === code.length && code.length < CODE_LENGTH;
                return (
                  <View
                    key={i}
                    style={[
                      styles.codeBox,
                      {
                        borderColor: isActive ? colors.primary : char ? colors.primary + '88' : colors.border,
                        backgroundColor: char ? colors.primary + '0F' : colors.gray100,
                      },
                    ]}
                    // Tap any box → focus the hidden input
                  >
                    <Text style={[styles.codeBoxChar, { color: colors.textPrimary }]}>{char}</Text>
                    {isActive && (
                      <View style={[styles.cursor, { backgroundColor: colors.primary }]} />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Tap-to-focus overlay */}
            <View
              style={StyleSheet.absoluteFill}
              accessible
              accessibilityRole="button"
              accessibilityLabel="Tap to enter invite code"
              onStartShouldSetResponder={() => {
                inputRef.current?.focus();
                return false;
              }}
            />
          </View>

          <Button
            title="Join Workspace"
            onPress={handleJoin}
            loading={joining}
            disabled={code.length !== CODE_LENGTH}
            fullWidth
            style={styles.joinBtn}
            icon="arrow-forward-circle-outline"
          />

          <Text style={[styles.hint, { color: colors.textTertiary }]}>
            Don't have a code? Ask your workspace admin to go to Members → Share Invite Link.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    padding: 24,
    paddingTop: 32,
    alignItems: 'stretch',
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  codeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  codeInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  codeBoxRow: {
    flexDirection: 'row',
    gap: 8,
  },
  codeBox: {
    width: 44,
    height: 54,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  codeBoxChar: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0,
  },
  cursor: {
    position: 'absolute',
    bottom: 8,
    width: 2,
    height: 22,
    borderRadius: 1,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  joinBtn: {
    marginBottom: 16,
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
