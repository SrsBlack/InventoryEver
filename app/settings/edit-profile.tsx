import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuthContext } from '../../contexts/AuthContext';
import { useColors } from '../../hooks/useColors';
import { supabase } from '../../lib/supabase';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Config } from '../../constants/config';

export default function EditProfileScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, profile, refreshProfile } = useAuthContext();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      setAvatarChanged(true);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let avatarUrl = profile?.avatar_url ?? null;

      if (avatarChanged && avatarUri) {
        // Read the file as base64 and upload to avatars/{userId}/avatar.jpg
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const filePath = `avatars/${user.id}/avatar.jpg`;

        const { error: uploadError } = await supabase.storage
          .from(Config.storageBucket)
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
          .from(Config.storageBucket)
          .getPublicUrl(filePath);

        // Append cache-buster so the image refreshes immediately
        avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      router.back();
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const initials =
    (fullName.trim() || profile?.full_name || user?.email || '?')
      .charAt(0)
      .toUpperCase();

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile' }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar picker */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper} activeOpacity={0.8}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.avatarHint, { color: colors.textSecondary }]}>
            Tap to change photo
          </Text>
        </View>

        {/* Fields */}
        <View style={styles.fields}>
          <Input
            label="Full Name"
            placeholder="Your name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
          />

          <Input
            label="Email"
            value={user?.email ?? ''}
            editable={false}
            containerStyle={{ opacity: 0.6 }}
            hint="Email cannot be changed here"
          />
        </View>

        <Button
          title="Save Changes"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          fullWidth
          style={styles.saveBtn}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrapper: { position: 'relative', marginBottom: 8 },
  avatarImage: { width: 88, height: 88, borderRadius: 16 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarHint: { fontSize: 13 },
  fields: { marginBottom: 8 },
  saveBtn: { marginTop: 8 },
});
