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
import { useAuthContext } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

export default function SignIn() {
  const colors = useColors();
  const { signIn, loading, error, clearError } = useAuthContext();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Required', 'Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    clearError();
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch {
      // error is in context
    } finally {
      setSubmitting(false);
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
        {/* Logo Area */}
        <View style={styles.logoArea}>
          <View style={[styles.logoIcon, { borderColor: colors.primary }]}>
            <Ionicons name="cube" size={32} color={colors.primary} />
          </View>
          <Text style={[styles.appName, { color: colors.textPrimary }]}>INVENTORYEVER</Text>
          <Text style={[styles.tagline, { color: colors.textTertiary }]}>Enterprise asset management</Text>
        </View>

        {/* Form */}
        <View style={styles.formArea}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>SIGN IN</Text>
          <Text style={[styles.subtitle, { color: colors.textTertiary }]}>Access your account</Text>

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

          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            icon="lock-closed"
            rightIcon={showPassword ? 'eye' : 'eye-off'}
            onRightIconPress={() => setShowPassword(v => !v)}
            required
          />

          <Button
            title="Sign In"
            onPress={handleSignIn}
            loading={submitting || loading}
            disabled={!email || !password}
            fullWidth
            size="lg"
          />

          <TouchableOpacity style={styles.forgotBtn} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textTertiary }]}>OR</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text style={[styles.signUpText, { color: colors.textSecondary }]}>
              Don't have an account? <Text style={[styles.signUpLink, { color: colors.primary }]}>Create one</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.guestBtn, { borderColor: colors.border }]}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="eye-outline" size={16} color={colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={[styles.guestText, { color: colors.textTertiary }]}>Continue as Guest (preview only)</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
  },
  logoArea: {
    paddingTop: 80,
    paddingBottom: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  formArea: {
    flex: 1,
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
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
  errorText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  forgotBtn: { alignItems: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 13, fontWeight: '500' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '600',
  },
  signUpBtn: { alignItems: 'center' },
  signUpText: { fontSize: 14 },
  signUpLink: { fontWeight: '700' },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 4,
  },
  guestText: { fontSize: 13 },
});
