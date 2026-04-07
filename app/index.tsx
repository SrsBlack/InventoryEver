import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthContext } from '../contexts/AuthContext';
import { SkeletonFullScreen } from '../components/ui/Skeleton';

export default function Index() {
  const { isAuthenticated, loading } = useAuthContext();
  const router = useRouter();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('hasOnboarded').then((value) => {
      setHasOnboarded(value === 'true');
      setOnboardingChecked(true);
    });
  }, []);

  useEffect(() => {
    if (!onboardingChecked || loading) return;

    if (!hasOnboarded) {
      router.replace('/(auth)/onboarding');
    } else if (isAuthenticated) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [isAuthenticated, loading, onboardingChecked, hasOnboarded, router]);

  return <SkeletonFullScreen />;
}
