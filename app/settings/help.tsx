import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { useColors } from '../../hooks/useColors';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'How do I add items?',
    answer: 'You can add items by taking a photo, scanning a receipt, using voice input, or entering details manually.',
  },
  {
    question: 'What does AI recognition do?',
    answer: 'Our AI analyzes photos of your items to automatically identify the product and fill in details like name, brand, and estimated value.',
  },
  {
    question: 'How do workspaces work?',
    answer: 'Workspaces let you organize your inventory into separate collections — like Home, Office, or Family.',
  },
  {
    question: 'What are the subscription tiers?',
    answer: 'Free gives you 50 items and 10 AI scans/month. Pro ($9.99/mo) gives 1,000 items and 100 scans. Business ($29.99/mo) gives 50,000 items and 10,000 scans.',
  },
  {
    question: 'How do I export my data?',
    answer: 'Go to Profile → Export Data to download your inventory as CSV or JSON.',
  },
];

export default function HelpScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const colors = useColors();

  const toggleFaq = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@inventoryever.app');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* FAQ */}
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>FAQ</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            {FAQ_ITEMS.map((item, index) => {
              const isExpanded = expandedIndex === index;
              const isLast = index === FAQ_ITEMS.length - 1;
              return (
                <View key={index} style={[styles.faqItem, { backgroundColor: colors.surface }, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <TouchableOpacity
                    onPress={() => toggleFaq(index)}
                    style={styles.faqQuestion}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.faqQuestionText, { color: colors.textPrimary }]}>{item.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{item.answer}</Text>
                  )}
                </View>
              );
            })}
          </Card>

          {/* Contact */}
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} style={styles.sectionIcon} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Contact</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <TouchableOpacity onPress={handleEmail} style={[styles.contactRow, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider }]} activeOpacity={0.7}>
              <Ionicons name="mail" size={20} color={colors.textSecondary} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email Support</Text>
                <Text style={[styles.contactValue, { color: colors.textPrimary }]}>support@inventoryever.app</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
            <View style={[styles.contactRow, { backgroundColor: colors.surface }]}>
              <Ionicons name="information-circle" size={20} color={colors.textSecondary} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Version</Text>
                <Text style={[styles.contactValue, { color: colors.textPrimary }]}>InventoryEver v1.0.0</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { padding: 16 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  sectionIcon: { marginRight: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  card: { marginBottom: 20 },
  faqItem: {},
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contactIcon: { marginRight: 12 },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '500',
  },
});
