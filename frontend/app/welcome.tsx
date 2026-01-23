import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

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
    description: 'Türkiye\'nin en büyük girişimci ağına katılın. Binlerce girişimciyle tanışın!',
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
    description: 'Şehrinizdeki girişimcilerle anlık mesajlaşın ve deneyim paylaşın.',
    features: [
      { icon: 'flash', text: 'Anlık Mesajlaşma' },
      { icon: 'people-circle', text: 'Mastermind Grupları' },
      { icon: 'notifications', text: 'Akıllı Bildirimler' },
    ],
  },
  {
    id: '3',
    icon: 'briefcase',
    iconBg: ['#f59e0b', '#d97706'],
    title: 'Hizmetlerini',
    highlight: 'Tanıt & Keşfet',
    description: 'Sunduğunuz hizmetleri sergileyin veya ihtiyacınız olan uzmanları bulun!',
    features: [
      { icon: 'storefront', text: 'Hizmet Vitrini' },
      { icon: 'search', text: 'Uzman Arama' },
      { icon: 'star', text: 'Değerlendirmeler' },
    ],
  },
  {
    id: '4',
    icon: 'calendar',
    iconBg: ['#ec4899', '#db2777'],
    title: 'Etkinliklere',
    highlight: 'Katıl & Öğren',
    description: 'Online ve yüz yüze networking etkinlikleriyle çevrenizi genişletin!',
    features: [
      { icon: 'videocam', text: 'Online Webinarlar' },
      { icon: 'cafe', text: 'Kahve Buluşmaları' },
      { icon: 'trophy', text: 'Yarışmalar' },
    ],
  },
  {
    id: '5',
    icon: 'sparkles',
    iconBg: ['#6366f1', '#4f46e5'],
    title: 'Hemen Başla,',
    highlight: 'Tamamen Ücretsiz!',
    description: 'Tüm özellikler ücretsiz. Hemen kayıt olun ve başlayın!',
    features: [
      { icon: 'checkmark-circle', text: '100% Ücretsiz' },
      { icon: 'shield-checkmark', text: 'Güvenli Platform' },
      { icon: 'heart', text: 'Girişimciler İçin' },
    ],
  },
];

export default function WelcomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(auth)/login');
    }
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
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

        {/* Main Content */}
        <View style={styles.content}>
          {/* Icon */}
          <LinearGradient
            colors={slide.iconBg}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={slide.icon} size={52} color="#fff" />
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
                  <Ionicons name={feature.icon} size={18} color={slide.iconBg[0]} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Pagination */}
          <View style={styles.pagination}>
            {slides.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setCurrentIndex(index)}
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
              colors={slide.iconBg}
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex === slides.length - 1 ? 'Başlayalım!' : 'Devam Et'}
              </Text>
              <Ionicons 
                name={currentIndex === slides.length - 1 ? 'rocket' : 'arrow-forward'} 
                size={20} 
                color="#fff" 
              />
            </LinearGradient>
          </TouchableOpacity>

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
    paddingVertical: 10,
  },
  skipButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
  },
  highlight: {
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  description: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  featuresContainer: {
    width: '100%',
    gap: 10,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#e5e7eb',
    fontWeight: '500',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
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
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loginLinkContainer: {
    marginTop: 14,
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
