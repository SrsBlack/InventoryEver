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
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../hooks/useColors';

const { width } = Dimensions.get('window');

interface OnboardingPage {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  circleColorKey: 'primary' | 'accent' | 'secondary' | 'warning' | 'info' | 'success';
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    title: 'Inventory Everything',
    description:
      'Track, organize, and manage everything you own — home, office, or warehouse — all in one place.',
    icon: 'cube',
    circleColorKey: 'primary',
  },
  {
    id: '2',
    title: 'AI-Powered Smart Entry',
    description:
      'Just snap a photo, scan a barcode, or speak — AI fills in the details automatically.',
    icon: 'camera',
    circleColorKey: 'accent',
  },
  {
    id: '3',
    title: 'Organize by Location',
    description:
      'Create rooms, areas, and spots. Scan QR codes to instantly find exactly where anything lives.',
    icon: 'location',
    circleColorKey: 'secondary',
  },
  {
    id: '4',
    title: 'Never Miss a Thing',
    description:
      'Smart alerts for expiring warranties, overdue maintenance, and low stock. Track depreciation and generate insurance reports.',
    icon: 'shield-checkmark',
    circleColorKey: 'warning',
  },
  {
    id: '5',
    title: 'Lend, Track & Recover',
    description:
      'Log who borrowed what and when it\'s due back. Build smart collections and filter your inventory in seconds.',
    icon: 'swap-horizontal',
    circleColorKey: 'info',
  },
  {
    id: '6',
    title: 'Built for Teams & Business',
    description:
      'Invite your team, assign roles, and collaborate on shared workspaces. Export data and view powerful analytics.',
    icon: 'people',
    circleColorKey: 'success',
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
      <View style={[styles.iconCircle, { backgroundColor: colors[item.circleColorKey] }]}>
        <Ionicons name={item.icon} size={100} color={colors.white} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{item.title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]}>{item.description}</Text>
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
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Skip button */}
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* Page counter */}
      <View style={styles.pageCounter}>
        <Text style={[styles.pageCounterText, { color: colors.textTertiary }]}>
          {activeIndex + 1} / {PAGES.length}
        </Text>
      </View>

      {/* Swipeable pages */}
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

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dot indicators */}
        <View style={styles.dotsContainer}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex
                  ? { width: 28, backgroundColor: colors.primary }
                  : { width: 8, backgroundColor: colors.gray300 },
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <LinearGradient
          colors={isLast ? colors.gradientPrimary : colors.gradientPrimary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextGradient}
        >
          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleNext}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get Started' : 'Next'}
          >
            <Text style={[styles.nextText, { color: colors.white }]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
            {!isLast && (
              <Ionicons name="arrow-forward" size={18} color={colors.white} style={{ marginLeft: 6 }} />
            )}
          </TouchableOpacity>
        </LinearGradient>
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
    fontSize: 16,
    fontWeight: '500',
  },
  pageCounter: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 10,
  },
  pageCounterText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  flatList: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
    paddingTop: 80,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 25,
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
    height: 8,
    borderRadius: 4,
  },
  nextGradient: {
    borderRadius: 14,
    width: width - 48,
  },
  nextButton: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  nextText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
