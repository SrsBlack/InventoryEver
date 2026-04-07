import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ForgotPassword() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'inventory-ever://reset-password' }
      );
      if (resetError) throw resetError;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
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
        <TouchableOpacity style={[styles.backBtn, { paddingTop: insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back to sign in</Text>
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={[styles.iconWrap, { borderColor: colors.primary }]}>
            <Ionicons name="lock-open-outline" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.textSecondary }]}>RESET PASSWORD</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>
            Enter your email and we'll send a link to reset your password.
          </Text>

          {sent ? (
            <View style={[styles.successBanner, { backgroundColor: colors.successLight, borderLeftColor: colors.success }]}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <Text style={[styles.successText, { color: colors.success }]}>
                Check your inbox — a reset link has been sent to {email.trim().toLowerCase()}.
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
                label="Email"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                icon="mail"
                required
              />

              <Button
                title="Send Reset Link"
                onPress={handleReset}
                loading={loading}
                disabled={!email.trim()}
                fullWidth
                size="lg"
              />
            </>
          )}

          <TouchableOpacity style={styles.signInBtn} onPress={() => router.replace('/(auth)/sign-in')}>
            <Text style={[styles.signInText, { color: colors.textSecondary }]}>
              Remember your password? <Text style={[styles.signInLink, { color: colors.primary }]}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 0,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  backText: { fontSize: 14 },
  content: { flex: 1, padding: 24, paddingBottom: 48 },
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
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
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
    alignItems: 'flex-start',
    gap: 10,
    borderLeftWidth: 3,
  },
  successText: { fontSize: 14, flex: 1, lineHeight: 20 },
  signInBtn: { alignItems: 'center', marginTop: 24 },
  signInText: { fontSize: 14 },
  signInLink: { fontWeight: '700' },
});
