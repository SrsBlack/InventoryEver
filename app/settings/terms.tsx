import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useColors } from '../../hooks/useColors';

export default function TermsScreen() {
  const colors = useColors();

  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Service', headerShown: true }} />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.lastUpdated, { color: colors.textTertiary }]}>Last updated: April 2026</Text>

        <Section title="Acceptance of Terms" colors={colors}>
          By downloading, installing, or using InventoryEver, you agree to be bound by these Terms of Service. If you do not agree, do not use the app.
        </Section>

        <Section title="Description of Service" colors={colors}>
          InventoryEver provides inventory management software for personal, home, and business use. Features include item tracking, AI recognition, location management, lending records, analytics, and team workspaces.
        </Section>

        <Section title="Account Registration" colors={colors}>
          <BulletList items={[
            'You must provide accurate and complete information when creating an account',
            'You are responsible for maintaining the security of your account credentials',
            'You must be at least 13 years old to use the service',
            'One person or legal entity may maintain multiple workspaces under one account',
          ]} colors={colors} />
        </Section>

        <Section title="Subscription Plans & Billing" colors={colors}>
          InventoryEver offers Free, Pro, and Business subscription tiers. Paid plans are billed through the App Store (iOS) or Google Play (Android). Subscriptions auto-renew unless cancelled at least 24 hours before the renewal date. Refunds are subject to App Store / Google Play policies.
        </Section>

        <Section title="Free Tier Limits" colors={colors}>
          Free accounts are limited to 50 items, 1 workspace, and limited AI scans per month. We reserve the right to modify free tier limits with 30 days notice.
        </Section>

        <Section title="Acceptable Use" colors={colors}>
          You agree not to:
          <BulletList items={[
            'Use the service for any unlawful purpose or in violation of any regulations',
            'Attempt to gain unauthorized access to our systems or other users\' data',
            'Upload malicious code, viruses, or harmful content',
            'Resell or redistribute the service without written permission',
            'Use the service to store or manage illegal goods or contraband',
          ]} colors={colors} />
        </Section>

        <Section title="Intellectual Property" colors={colors}>
          The InventoryEver app, its design, code, and branding are owned by us and protected by copyright law. Your inventory data belongs to you. You grant us a limited license to process your data solely to provide the service.
        </Section>

        <Section title="Data & Privacy" colors={colors}>
          Your use of the service is also governed by our Privacy Policy, which is incorporated into these Terms by reference.
        </Section>

        <Section title="Service Availability" colors={colors}>
          We strive for high availability but do not guarantee uninterrupted service. We may perform maintenance, updates, or experience outages. We are not liable for downtime or data loss due to circumstances beyond our control.
        </Section>

        <Section title="Termination" colors={colors}>
          You may delete your account at any time in Settings → Account. We may suspend or terminate accounts that violate these Terms, with or without notice. Upon termination, your data will be deleted per our Privacy Policy.
        </Section>

        <Section title="Limitation of Liability" colors={colors}>
          To the maximum extent permitted by law, InventoryEver is not liable for indirect, incidental, or consequential damages. Our total liability for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.
        </Section>

        <Section title="Disclaimer of Warranties" colors={colors}>
          The service is provided "as is" without warranties of any kind, express or implied, including fitness for a particular purpose or non-infringement.
        </Section>

        <Section title="Governing Law" colors={colors}>
          These Terms are governed by the laws of the jurisdiction in which we operate, without regard to conflict of law principles.
        </Section>

        <Section title="Changes to Terms" colors={colors}>
          We may update these Terms periodically. Continued use after changes constitutes acceptance. Significant changes will be communicated via in-app notification.
        </Section>

        <Section title="Contact" colors={colors}>
          {'For questions about these Terms:\n\nlegal@inventoryever.app'}
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
