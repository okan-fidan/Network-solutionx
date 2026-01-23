import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string[];
  title: string;
  highlight: string;
  description: string;
  features: { icon: keyof typeof Ionicons.glyphMap; text: string }[];
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'rocket',
    iconBg: ['#6366f1', '#8b5cf6'],
    title: 'Girişimciliğin',
    highlight: 'Yeni Merkezi',
    description: 'Türkiye\'nin en büyük girişimci ağına katılın. Binlerce girişimciyle tanışın, fikir alışverişi yapın.',
    features: [
      { icon: 'people', text: '10.000+ Aktif Girişimci' },
      { icon: 'location', text: '81 İlde Yerel Topluluklar' },
      { icon: 'trending-up', text: 'Hızla Büyüyen Network' },
    ],
  },
  {
    id: '2',
    icon: 'chatbubbles',
    iconBg: ['#10b981', '#059669'],
    title: 'Bağlantı Kur,',
    highlight: 'İş Birliği Yap',
    description: 'Şehrinizdeki girişimcilerle anlık mesajlaşın. Grup sohbetlerinde deneyimlerinizi paylaşın.',
    features: [
      { icon: 'flash', text: 'Anlık Mesajlaşma' },
      { icon: 'people-circle', text: 'Özel Mastermind Grupları' },
      { icon: 'notifications', text: 'Akıllı Bildirimler' },
    ],
  },
  {
    id: '3',
    icon: 'briefcase',
    iconBg: ['#f59e0b', '#d97706'],
    title: 'Hizmetlerini',
    highlight: 'Tanıt & Keşfet',
    description: 'Sunduğunuz hizmetleri sergileyin veya ihtiyacınız olan uzmanları bulun. İş fırsatlarını kaçırmayın!',
    features: [
      { icon: 'storefront', text: 'Hizmet Vitrini' },
      { icon: 'search', text: 'Uzman Arama' },
      { icon: 'star', text: 'Değerlendirme Sistemi' },
    ],
  },
  {
    id: '4',
    icon: 'calendar',
    iconBg: ['#ec4899', '#db2777'],
    title: 'Etkinliklere',
    highlight: 'Katıl & Öğren',
    description: 'Online ve yüz yüze networking etkinlikleriyle çevrenizi genişletin. Her hafta yeni fırsatlar!',
    features: [
      { icon: 'videocam', text: 'Online Webinarlar' },
      { icon: 'cafe', text: 'Kahve Buluşmaları' },
      { icon: 'trophy', text: 'Girişimci Yarışmaları' },
    ],
  },
  {
    id: '5',
    icon: 'sparkles',
    iconBg: ['#6366f1', '#4f46e5'],
    title: 'Hemen Başla,',
    highlight: 'Ücretsiz!',
    description: 'Tüm özellikler tamamen ücretsiz. Hemen kayıt olun ve girişimcilik yolculuğunuza güç katın!',
    features: [
      { icon: 'checkmark-circle', text: '100% Ücretsiz' },
      { icon: 'shield-checkmark', text: 'Güvenli Platform' },
      { icon: 'heart', text: 'Girişimciler İçin Tasarlandı' },
    ],
  },
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      scrollViewRef.current?.scrollTo({ x: nextIndex * width, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(auth)/login');
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / width);
    if (index !== currentIndex && index >= 0 && index < slides.length) {
      setCurrentIndex(index);
    }
  };

  const currentSlide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background */}
      <LinearGradient
        colors={['#0f0f1a', '#1a1a2e', '#0f0f1a']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Ionicons name="close" size={26} color="#9ca3af" />
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>{currentIndex + 1} / {slides.length}</Text>
        </View>

        {/* Content */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={slide.id} style={styles.slide}>
              {/* Icon */}
              <LinearGradient
                colors={slide.iconBg}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={slide.icon} size={56} color="#fff" />
              </LinearGradient>

              {/* Title */}
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={[styles.highlight, { color: slide.iconBg[0] }]}>{slide.highlight}</Text>

              {/* Description */}
              <Text style={styles.description}>{slide.description}</Text>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {slide.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <View style={[styles.featureIcon, { backgroundColor: slide.iconBg[0] + '20' }]}>
                      <Ionicons name={feature.icon} size={20} color={slide.iconBg[0]} />
                    </View>
                    <Text style={styles.featureText}>{feature.text}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Pagination Dots */}
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Next Button */}
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <LinearGradient
              colors={currentSlide.iconBg}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? 'Başlayalım!' : 'Devam Et'}
              </Text>
              <Ionicons 
                name={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'} 
                size={22} 
                color="#fff" 
              />
            </LinearGradient>
          </TouchableOpacity>

          {/* Login Link on Last Slide */}
          {currentIndex === slides.length - 1 && (
            <TouchableOpacity onPress={handleSkip} style={styles.loginLinkContainer}>
              <Text style={styles.alreadyMember}>
                Zaten üye misiniz? <Text style={styles.loginLink}>Giriş Yapın</Text>
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
  },
  highlight: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 14,
    borderRadius: 14,
    gap: 12,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    color: '#e5e7eb',
    fontWeight: '500',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#6366f1',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#4b5563',
  },
  nextButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loginLinkContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  alreadyMember: {
    color: '#6b7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#6366f1',
    fontWeight: '600',
  },
});
