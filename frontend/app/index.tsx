import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboardingAndAuth = async () => {
      try {
        // Önce onboarding tamamlanmış mı kontrol et
        const onboardingCompleted = await AsyncStorage.getItem('onboarding_completed');
        
        if (!onboardingCompleted && !user) {
          // İlk kez açılıyorsa welcome sayfasına git
          router.replace('/welcome');
          return;
        }

        // Auth durumuna göre yönlendir
        if (!loading) {
          if (!user) {
            router.replace('/(auth)/login');
          } else if (userProfile?.needsEmailVerification) {
            router.replace('/(auth)/verify-email');
          } else if (userProfile?.needsRegistration) {
            router.replace('/(auth)/register-profile');
          } else {
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        router.replace('/(auth)/login');
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingAndAuth();
  }, [user, userProfile, loading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
