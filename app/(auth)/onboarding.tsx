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
import { Colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

interface OnboardingPage {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  circleColor: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: '1',
    title: 'Inventory Everything',
    description:
      'Track, organize, and manage everything you own in one beautiful app.',
    icon: 'cube',
    circleColor: Colors.primary,
  },
  {
    id: '2',
    title: 'AI-Powered Smart Entry',
    description:
      'Just snap a photo or speak — AI identifies your items and fills in the details automatically.',
    icon: 'camera',
    circleColor: Colors.accent,
  },
  {
    id: '3',
    title: 'Never Miss a Thing',
    description:
      'Get alerts for expiring warranties, scheduled maintenance, and low stock items.',
    icon: 'notifications',
    circleColor: Colors.secondary,
  },
];

export default function Onboarding() {
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

  const renderItem = ({ item }: ListRenderItemInfo<OnboardingPage>) => (
    <View style={styles.page}>
      <View style={[styles.iconCircle, { backgroundColor: item.circleColor }]}>
        <Ionicons name={item.icon} size={120} color={Colors.white} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
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

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {activeIndex < PAGES.length - 1 && (
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      )}

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
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Get Started button — only on last page */}
        {activeIndex === PAGES.length - 1 && (
          <LinearGradient
            colors={Colors.gradientPrimary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.getStartedGradient}
          >
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={handleFinish}
              activeOpacity={0.85}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
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
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  flatList: {
    flex: 1,
  },
  page: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  iconCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingBottom: 48,
    alignItems: 'center',
    gap: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    width: 28,
    backgroundColor: Colors.primary,
  },
  dotInactive: {
    width: 10,
    backgroundColor: Colors.gray300,
  },
  getStartedGradient: {
    borderRadius: 14,
    width: width - 48,
  },
  getStartedButton: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
