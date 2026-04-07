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
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthContext } from '../../contexts/AuthContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

export default function SignUp() {
  const colors = useColors();
  const { signUp, loading, error, clearError } = useAuthContext();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Required', 'Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Mismatch', "Passwords don't match.");
      return;
    }
    if (password.length < 6) {
      Alert.alert('Too short', 'Password must be at least 6 characters.');
      return;
    }
    setSubmitting(true);
    clearError();
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please verify your email to continue.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/sign-in') }]
      );
    } catch {
      // error in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={colors.gradientPrimary} style={styles.header}>
        <Ionicons name="sparkles" size={48} color={colors.white} style={styles.logo} />
        <Text style={[styles.headerTitle, { color: colors.white }]}>Create Account</Text>
        <Text style={[styles.headerSubtitle, { color: colors.white + 'CC' }]}>Start organizing everything you own</Text>
      </LinearGradient>

      <ScrollView
        style={styles.form}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.errorLight }]}>
            <Ionicons name="alert-circle" size={16} color={colors.error} />
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}

        <Input
          label="Full Name"
          placeholder="Your full name"
          value={fullName}
          onChangeText={setFullName}
          autoCorrect={false}
          icon="person"
          required
        />

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
          placeholder="Repeat your password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
          icon="lock-closed"
          error={confirmPassword && password !== confirmPassword ? "Passwords don't match" : undefined}
          required
        />

        <View style={styles.termsContainer}>
          <Text style={[styles.termsText, { color: colors.textSecondary }]}>
            By creating an account, you agree to our{' '}
            <Text style={[styles.termsLink, { color: colors.primary }]}>Terms of Service</Text> and{' '}
            <Text style={[styles.termsLink, { color: colors.primary }]}>Privacy Policy</Text>.
          </Text>
        </View>

        <Button
          title="Create Account"
          onPress={handleSignUp}
          loading={submitting || loading}
          disabled={!fullName || !email || !password || !confirmPassword}
          fullWidth
          size="lg"
        />

        <TouchableOpacity
          style={styles.signInBtn}
          onPress={() => router.back()}
        >
          <Text style={[styles.signInText, { color: colors.textSecondary }]}>
            Already have an account? <Text style={[styles.signInLink, { color: colors.primary }]}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingTop: 64,
    paddingBottom: 32,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logo: { fontSize: 48, marginBottom: 10 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  form: { flex: 1 },
  formContent: { padding: 24, paddingBottom: 48 },
  errorBanner: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { fontSize: 14, fontWeight: '500', flex: 1 },
  termsContainer: { marginBottom: 20 },
  termsText: { fontSize: 13, lineHeight: 18 },
  termsLink: { fontWeight: '500' },
  signInBtn: { alignItems: 'center', marginTop: 20 },
  signInText: { fontSize: 15 },
  signInLink: { fontWeight: '700' },
});
