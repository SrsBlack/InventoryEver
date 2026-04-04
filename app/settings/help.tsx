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
import { Colors } from '../../constants/colors';

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

  const toggleFaq = (index: number) => {
    setExpandedIndex(prev => (prev === index ? null : index));
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@inventoryever.app');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Help & Support' }} />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          {/* FAQ */}
          <View style={styles.sectionHeader}>
            <Ionicons name="help-circle-outline" size={18} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>FAQ</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            {FAQ_ITEMS.map((item, index) => {
              const isExpanded = expandedIndex === index;
              const isLast = index === FAQ_ITEMS.length - 1;
              return (
                <View key={index} style={[styles.faqItem, !isLast && styles.faqBorder]}>
                  <TouchableOpacity
                    onPress={() => toggleFaq(index)}
                    style={styles.faqQuestion}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.faqQuestionText}>{item.question}</Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </TouchableOpacity>
                  {isExpanded && (
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                  )}
                </View>
              );
            })}
          </Card>

          {/* Contact */}
          <View style={styles.sectionHeader}>
            <Ionicons name="mail-outline" size={18} color={Colors.primary} style={styles.sectionIcon} />
            <Text style={styles.sectionTitle}>Contact</Text>
          </View>
          <Card variant="bordered" padding={0} style={styles.card}>
            <TouchableOpacity onPress={handleEmail} style={[styles.contactRow, styles.rowBorder]} activeOpacity={0.7}>
              <Ionicons name="mail" size={20} color={Colors.textSecondary} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Email Support</Text>
                <Text style={styles.contactValue}>support@inventoryever.app</Text>
              </View>
              <Ionicons name="open-outline" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
            <View style={styles.contactRow}>
              <Ionicons name="information-circle" size={20} color={Colors.textSecondary} style={styles.contactIcon} />
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Version</Text>
                <Text style={styles.contactValue}>InventoryEver v1.0.0</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
    color: Colors.textPrimary,
  },
  card: { marginBottom: 20 },
  faqItem: { backgroundColor: Colors.surface },
  faqBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
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
    color: Colors.textPrimary,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.divider },
  contactIcon: { marginRight: 12 },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
