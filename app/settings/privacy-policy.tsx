import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useColors } from '../../hooks/useColors';

export default function PrivacyPolicyScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy', headerShown: true }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>Last updated: April 2026</Text>

        <Section title="Overview" colors={colors}>
          InventoryEver ("we", "our", or "us") is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights over it.
        </Section>

        <Section title="Data We Collect" colors={colors}>
          <BulletList items={[
            'Account information: email address, display name, and profile photo (optional)',
            'Inventory data: items, photos, locations, categories, and tags you create',
            'Usage data: feature interactions, session duration, and crash reports',
            'Device information: device model, OS version, and push notification token',
          ]} colors={colors} />
        </Section>

        <Section title="How We Use Your Data" colors={colors}>
          <BulletList items={[
            'To provide and improve the InventoryEver service',
            'To send push notifications for alerts you configure (warranties, maintenance)',
            'To process AI image recognition and barcode lookups on your behalf',
            'To generate anonymous, aggregated analytics to improve the app',
            'To respond to your support requests',
          ]} colors={colors} />
        </Section>

        <Section title="Data Storage & Security" colors={colors}>
          Your data is stored securely on Supabase infrastructure in encrypted databases. We use row-level security to ensure only you (and your invited team members) can access your workspace data. All data is transmitted over HTTPS/TLS.
        </Section>

        <Section title="AI Features" colors={colors}>
          When you use AI-powered features (image recognition, receipt scanning, voice input), your photos or voice data are sent to our secure Edge Functions which proxy requests to AI providers (OpenAI, Google Vision). Your images are not stored by AI providers and are not used to train their models under our API agreements.
        </Section>

        <Section title="Third-Party Services" colors={colors}>
          <BulletList items={[
            'Supabase — database, authentication, and file storage',
            'OpenAI / Google Vision — AI recognition features (data not retained)',
            'RevenueCat — subscription management (no payment card data handled by us)',
            'PostHog — anonymized product analytics',
            'Sentry — crash reporting (no personal data in error reports)',
          ]} colors={colors} />
        </Section>

        <Section title="Data Sharing" colors={colors}>
          We do not sell your personal data. We do not share your inventory data with third parties. Aggregated, anonymized usage statistics may be used for product improvement.
        </Section>

        <Section title="Your Rights" colors={colors}>
          <BulletList items={[
            'Access: request a copy of all data we hold about you',
            'Correction: update inaccurate data in the app at any time',
            'Deletion: delete your account and all associated data from your profile settings',
            'Export: download your inventory data at any time from Settings → Export',
            'Opt-out: disable analytics and push notifications in Settings → Notifications',
          ]} colors={colors} />
        </Section>

        <Section title="Data Retention" colors={colors}>
          Your data is retained as long as your account is active. When you delete your account, all personal data and inventory data is permanently deleted within 30 days. Anonymized usage analytics may be retained.
        </Section>

        <Section title="Children's Privacy" colors={colors}>
          InventoryEver is not directed to children under 13. We do not knowingly collect personal information from children under 13.
        </Section>

        <Section title="Changes to This Policy" colors={colors}>
          We may update this policy periodically. Significant changes will be communicated via in-app notification. Continued use after changes constitutes acceptance.
        </Section>

        <Section title="Contact Us" colors={colors}>
          {'For privacy questions or data requests, contact us at:\n\nprivacy@inventoryever.app'}
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {typeof children === 'string' ? (
        <Text style={[styles.body, { color: colors.textSecondary }]}>{children}</Text>
      ) : children}
    </View>
  );
}

function BulletList({ items, colors }: { items: string[]; colors: any }) {
  return (
    <View style={styles.bulletList}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
          <Text style={[styles.body, { color: colors.textSecondary, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 60 },
  lastUpdated: { fontSize: 12, marginBottom: 20 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 22 },
  bulletList: { gap: 6 },
  bulletRow: { flexDirection: 'row', gap: 8 },
  bulletDot: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
});
