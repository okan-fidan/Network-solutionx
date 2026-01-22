import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  useWindowDimensions,
  Image,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  gradient: string[];
  stats?: { label: string; value: string }[];
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'rocket',
    title: 'Network Solution\'a\nHoş Geldiniz!',
    subtitle: 'Girişimcilerin Buluşma Noktası',
    description: 'Türkiye\'nin 81 ilinden binlerce girişimciyle tanışın, fikir alışverişi yapın ve işinizi büyütün.',
    color: '#6366f1',
    gradient: ['#4338ca', '#6366f1', '#818cf8'],
    stats: [
      { label: 'Girişimci', value: '10K+' },
      { label: 'Topluluk', value: '81' },
      { label: 'Mesaj', value: '1M+' },
    ],
  },
  {
    id: '2',
    icon: 'people',
    title: 'Şehir Topluluklarına\nKatılın',
    subtitle: 'Yerel Girişimcilerle Tanışın',
    description: 'Şehrinize özel toplulukta benzer hedeflere sahip girişimcilerle bağlantı kurun. Mastermind gruplarına katılın.',
    color: '#10b981',
    gradient: ['#059669', '#10b981', '#34d399'],
  },
  {
    id: '3',
    icon: 'school',
    title: 'Mentorlardan\nÖğrenin',
    subtitle: 'Deneyimli Girişimcilerden Rehberlik',
    description: 'Alanında uzman mentorlarla 1-1 görüşme yapın. Tecrübelerinden faydalanın ve hatalardan kaçının.',
    color: '#8b5cf6',
    gradient: ['#7c3aed', '#8b5cf6', '#a78bfa'],
  },
  {
    id: '4',
    icon: 'calendar',
    title: 'Etkinliklere\nKatılın',
    subtitle: 'Haftalık Networking Buluşmaları',
    description: 'Online ve yüz yüze etkinliklerde yeni insanlarla tanışın. İş birliği fırsatları yakalayın.',
    color: '#f59e0b',
    gradient: ['#d97706', '#f59e0b', '#fbbf24'],
  },
  {
    id: '5',
    icon: 'trophy',
    title: 'Seviye Atlayın\nRozet Kazanın',
    subtitle: 'Gamification ile Motivasyon',
    description: 'Aktifliğinize göre seviye atlayın, rozetler kazanın ve liderlik tablosunda yerinizi alın!',
    color: '#ec4899',
    gradient: ['#db2777', '#ec4899', '#f472b6'],
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    await AsyncStorage.setItem('onboardingCompleted', 'true');
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <View style={[styles.slide, { width }]}>
      <LinearGradient
        colors={item.gradient}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={item.icon} size={80} color="#fff" />
      </LinearGradient>
      
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.subtitle}>{item.subtitle}</Text>
      <Text style={styles.description}>{item.description}</Text>
      
      {item.stats && (
        <View style={styles.statsContainer}>
          {item.stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const currentSlide = slides[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="business" size={24} color="#6366f1" />
          <Text style={styles.logoText}>Network Solution</Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Atla</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Pagination */}
      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => {
              flatListRef.current?.scrollToIndex({ index, animated: true });
              setCurrentIndex(index);
            }}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: index === currentIndex ? currentSlide.color : '#4b5563',
                  width: index === currentIndex ? 28 : 10,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <LinearGradient
            colors={currentSlide.gradient}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.buttonText}>
              {currentIndex === slides.length - 1 ? 'Başlayalım!' : 'Devam'}
            </Text>
            <View style={styles.buttonIconContainer}>
              <Ionicons 
                name={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'} 
                size={22} 
                color="#fff" 
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {currentIndex === slides.length - 1 && (
          <Text style={styles.footerNote}>
            Başlayarak Kullanım Koşullarını kabul etmiş olursunuz
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  skipText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6366f1',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    marginTop: 40,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
    transition: 'all 0.3s',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  button: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerNote: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
