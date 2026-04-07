import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

export default function ResetPassword() {
  const colors = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ access_token?: string; type?: string }>();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    // Supabase will auto-exchange the token from the deep link URL and fire onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });
    // If access_token is present in params (web flow), set session manually
    if (params.access_token && params.type === 'recovery') {
      supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: '',
      }).then(() => setSessionReady(true));
    }
    return () => subscription.unsubscribe();
  }, [params.access_token, params.type]);

  const handleUpdate = async () => {
    if (!password || password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setDone(true);
      setTimeout(() => router.replace('/(auth)/sign-in'), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={[styles.iconWrap, { borderColor: colors.primary }]}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textSecondary }]}>NEW PASSWORD</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Choose a new password for your account.</Text>

          {done ? (
            <View style={[styles.successBanner, { backgroundColor: colors.successLight, borderLeftColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Password updated! Redirecting to sign in…
              </Text>
            </View>
          ) : !sessionReady ? (
            <View style={[styles.infoBanner, { backgroundColor: colors.infoLight, borderLeftColor: colors.info }]}>
              <Ionicons name="information-circle" size={16} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.info }]}>
                Waiting for password recovery session… Make sure you opened this from the reset email link.
              </Text>
            </View>
          ) : (
            <>
              {error && (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorLight, borderLeftColor: colors.error }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              )}

              <Input
                label="New Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                icon="lock-closed"
                rightIcon={showPassword ? 'eye' : 'eye-off'}
                onRightIconPress={() => setShowPassword(v => !v)}
                required
              />

              <Input
                label="Confirm Password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                icon="lock-closed"
                required
              />

              <Button
                title="Update Password"
                onPress={handleUpdate}
                loading={loading}
                disabled={!password || !confirmPassword}
                fullWidth
                size="lg"
              />
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flex: 1, padding: 24, paddingTop: 80, paddingBottom: 48 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, marginBottom: 24 },
  errorBanner: {
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
  },
  errorText: { fontSize: 13, fontWeight: '500', flex: 1 },
  successBanner: {
    padding: 16,
    borderRadius: 4,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderLeftWidth: 3,
  },
  successText: { fontSize: 14, flex: 1 },
  infoBanner: {
    padding: 14,
    borderRadius: 4,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 3,
  },
  infoText: { fontSize: 13, flex: 1, lineHeight: 20 },
});
