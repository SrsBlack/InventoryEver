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
import { Colors } from '../../constants/colors';

export default function SignIn() {
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
      style={styles.flex}
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
          <View style={styles.logoIcon}>
            <Ionicons name="cube" size={32} color={Colors.primary} />
          </View>
          <Text style={styles.appName}>INVENTORYEVER</Text>
          <Text style={styles.tagline}>Enterprise asset management</Text>
        </View>

        {/* Form */}
        <View style={styles.formArea}>
          <Text style={styles.title}>SIGN IN</Text>
          <Text style={styles.subtitle}>Access your account</Text>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
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

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.signUpBtn}
            onPress={() => router.push('/(auth)/sign-up')}
          >
            <Text style={styles.signUpText}>
              Don't have an account? <Text style={styles.signUpLink}>Create one</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Ionicons name="eye-outline" size={16} color={Colors.textTertiary} style={{ marginRight: 6 }} />
            <Text style={styles.guestText}>Continue as Guest (preview only)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.devBtn}
            onPress={() => {
              setEmail('demo@inventoryever.com');
              setPassword('demo1234');
            }}
          >
            <Ionicons name="code-slash-outline" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.devText}>Fill demo credentials</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
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
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: 3,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 13,
    color: Colors.textTertiary,
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
    color: Colors.textSecondary,
    letterSpacing: 2,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textTertiary,
    marginBottom: 24,
  },
  errorBanner: {
    backgroundColor: Colors.errorLight,
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.error,
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  forgotBtn: { alignItems: 'flex-end', marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 13, color: Colors.primary, fontWeight: '500' },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 1,
    fontWeight: '600',
  },
  signUpBtn: { alignItems: 'center' },
  signUpText: { fontSize: 14, color: Colors.textSecondary },
  signUpLink: { color: Colors.primary, fontWeight: '700' },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
  },
  guestText: { fontSize: 13, color: Colors.textTertiary },
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
  },
  devText: { fontSize: 13, color: Colors.primary },
});
