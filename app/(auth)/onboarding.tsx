import { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../hooks/useColors';

const { width } = Dimensions.get('window');

interface BulletItem {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}

interface OnboardingPage {
  id: string;
  title: string;
  description?: string;
  bullets?: BulletItem[];
  cta?: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    title: 'Inventory Everything',
    bullets: [
      { icon: 'scan-outline', text: 'AI scanning — snap a photo or barcode to auto-fill details' },
      { icon: 'shield-checkmark-outline', text: 'Warranty alerts — never miss an expiry again' },
      { icon: 'location-outline', text: 'Locations — rooms, areas, and QR code spots' },
      { icon: 'people-outline', text: 'Team sharing — invite members and assign roles' },
    ],
  },
  {
    id: '2',
    title: "You're ready.",
    description: 'Start tracking what matters.',
    cta: 'Get Started',
  },
];

export default function Onboarding() {
  const colors = useColors();
  const router = useRouter();
  const flatListRef = useRef<FlatList<OnboardingPage>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleFinish = async () => {
    await AsyncStorage.setItem('hasOnboarded', 'true');
    router.replace('/(auth)/sign-in');
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleNext = () => {
    if (activeIndex < PAGES.length - 1) {
      const nextIndex = activeIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setActiveIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const renderItem = ({ item }: ListRenderItemInfo<OnboardingPage>) => (
    <View style={styles.page}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
      {item.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
      )}
      {item.bullets && (
        <View style={styles.bulletList}>
          {item.bullets.map((bullet, i) => (
            <View key={i} style={styles.bulletRow}>
              <Ionicons name={bullet.icon} size={16} color={colors.textSecondary} style={styles.bulletIcon} />
              <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{bullet.text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const isLast = activeIndex === PAGES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        scrollEventThrottle={16}
      />

      <View style={styles.bottomSection}>
        <View style={styles.dotsContainer}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex
                  ? { width: 16, backgroundColor: colors.primary }
                  : { width: 4, backgroundColor: colors.gray300 },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: colors.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Get Started' : 'Next'}
        >
          <Text style={[styles.nextText, { color: colors.white }]}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
          {!isLast && (
            <Ionicons name="arrow-forward" size={16} color={colors.white} style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 56,
    right: 24,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
  },
  bulletList: {
    gap: 16,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  bulletText: {
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
  },
  bottomSection: {
    paddingBottom: 52,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 20,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  nextButton: {
    borderRadius: 4,
    width: width - 48,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
