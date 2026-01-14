import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface TourStep {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: '1',
    icon: 'people',
    title: 'Topluluğa Katıl',
    description: '81 ilin girişimci topluluğuna katılın, aynı şehirdeki girişimcilerle tanışın ve networking yapın.',
    color: '#6366f1',
  },
  {
    id: '2',
    icon: 'chatbubbles',
    title: 'Sohbet Et',
    description: 'Gruplarda mesajlaşın, alt gruplara katılın ve diğer girişimcilerle fikirlerinizi paylaşın.',
    color: '#10b981',
  },
  {
    id: '3',
    icon: 'briefcase',
    title: 'Hizmet Paylaş',
    description: 'Sunduğunuz hizmetleri yayınlayın, diğer girişimcilerin hizmetlerinden yararlanın.',
    color: '#f59e0b',
  },
  {
    id: '4',
    icon: 'trophy',
    title: 'Rozet Kazan',
    description: 'Aktif olun, rozetler kazanın ve liderlik tablosunda yerinizi alın!',
    color: '#ec4899',
  },
  {
    id: '5',
    icon: 'calendar',
    title: 'Etkinliklere Katıl',
    description: 'Girişimcilik etkinliklerine katılın, workshoplara kayıt olun ve bilginizi artırın.',
    color: '#8b5cf6',
  },
];

export default function OnboardingTourScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleNext = () => {
    if (currentIndex < TOUR_STEPS.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      completeTour();
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const completeTour = async () => {
    try {
      await AsyncStorage.setItem('onboarding_completed', 'true');
    } catch (error) {
      console.error('Error saving onboarding status:', error);
    }
    router.replace('/(tabs)');
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / width);
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  const currentStep = TOUR_STEPS[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Atla</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
      >
        {TOUR_STEPS.map((step) => (
          <View key={step.id} style={[styles.slide, { width }]}>
            <View style={[styles.iconContainer, { backgroundColor: step.color }]}>
              <Ionicons name={step.icon as any} size={80} color="#fff" />
            </View>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.description}>{step.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {TOUR_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                width: index === currentIndex ? 24 : 8,
                backgroundColor: index === currentIndex ? currentStep.color : '#374151',
                opacity: index === currentIndex ? 1 : 0.5,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: currentStep.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {currentIndex === TOUR_STEPS.length - 1 ? 'Başla' : 'Devam'}
          </Text>
          <Ionicons 
            name={currentIndex === TOUR_STEPS.length - 1 ? 'checkmark' : 'arrow-forward'} 
            size={20} 
            color="#fff" 
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 10 },
  skipText: { color: '#6b7280', fontSize: 16 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconContainer: { width: 160, height: 160, borderRadius: 80, justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 16, textAlign: 'center' },
  description: { fontSize: 16, color: '#9ca3af', textAlign: 'center', lineHeight: 24 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 40 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  footer: { paddingHorizontal: 20, paddingBottom: 20 },
  nextButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 12, gap: 8 },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
