import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  StatusBar,
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

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboarding_completed', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      await AsyncStorage.setItem('onboarding_completed', 'true');
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    return (
      <View style={styles.slide}>
        <Animated.View style={[styles.content, { opacity, transform: [{ scale }, { translateY }] }]}>
          {/* Animated Icon */}
          <LinearGradient
            colors={item.iconBg}
            style={styles.iconContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={item.icon} size={64} color="#fff" />
          </LinearGradient>

          {/* Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.highlight}>{item.highlight}</Text>
          </View>

          {/* Description */}
          <Text style={styles.description}>{item.description}</Text>

          {/* Features */}
          <View style={styles.featuresContainer}>
            {item.features.map((feature, idx) => (
              <Animated.View 
                key={idx} 
                style={[
                  styles.featureItem,
                  {
                    opacity: scrollX.interpolate({
                      inputRange,
                      outputRange: [0, 1, 0],
                      extrapolate: 'clamp',
                    }),
                    transform: [{
                      translateX: scrollX.interpolate({
                        inputRange,
                        outputRange: [50 * (idx + 1), 0, -50 * (idx + 1)],
                        extrapolate: 'clamp',
                      }),
                    }],
                  }
                ]}
              >
                <View style={[styles.featureIcon, { backgroundColor: item.iconBg[0] + '20' }]}>
                  <Ionicons name={feature.icon} size={20} color={item.iconBg[0]} />
                </View>
                <Text style={styles.featureText}>{feature.text}</Text>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  };

  const renderPagination = () => {
    return (
      <View style={styles.pagination}>
        {slides.map((_, index) => {
          const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
          
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });

          const dotOpacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.4, 1, 0.4],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity: dotOpacity,
                  backgroundColor: currentIndex === index ? '#6366f1' : '#6b7280',
                },
              ]}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0a0a0a', '#1a1a2e', '#0a0a0a']}
        style={StyleSheet.absoluteFill}
      />

      {/* Skip Button */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Ionicons name="close" size={28} color="#9ca3af" />
        </TouchableOpacity>
        <Text style={styles.pageIndicator}>{currentIndex + 1} / {slides.length}</Text>
      </SafeAreaView>

      {/* Slides */}
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        scrollEventThrottle={16}
      />

      {/* Bottom Section */}
      <SafeAreaView edges={['bottom']} style={styles.bottomSection}>
        {renderPagination()}
        
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient
            colors={['#6366f1', '#4f46e5']}
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

        {currentIndex === slides.length - 1 && (
          <Text style={styles.alreadyMember}>
            Zaten üye misiniz?{' '}
            <Text style={styles.loginLink} onPress={handleSkip}>Giriş Yapın</Text>
          </Text>
        )}
      </SafeAreaView>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 20,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
    textAlign: 'center',
  },
  highlight: {
    fontSize: 36,
    fontWeight: '800',
    color: '#6366f1',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  featuresContainer: {
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
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
    paddingBottom: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  alreadyMember: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#6366f1',
    fontWeight: '600',
  },
});
