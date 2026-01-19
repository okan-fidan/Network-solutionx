import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { membershipApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// AdMob Reklam ID'leri
const AD_UNIT_IDS = {
  android: {
    banner: 'ca-app-pub-4676051761874687/9606646838', // Gerçek Android Banner ID
  },
  ios: {
    banner: 'ca-app-pub-4676051761874687/9606646838', // iOS için de aynı veya farklı ID kullanılabilir
  },
  // Test ID'leri (Geliştirme için)
  test: {
    banner: 'ca-app-pub-3940256099942544/6300978111', // Google test banner ID
  }
};

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo';

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
  testMode?: boolean;
}

// Premium kullanıcılar için reklam gizleme + AdMob entegrasyonu
export const AdBanner: React.FC<AdBannerProps> = ({ style, testMode = false }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [AdMobBanner, setAdMobBanner] = useState<any>(null);
  const [adError, setAdError] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkMembership();
    loadAdMob();
  }, [user]);

  const checkMembership = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const response = await membershipApi.getStatus();
      setIsPremium(response.data.isPremium);
    } catch (error) {
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAdMob = async () => {
    // Expo Go'da veya Web'de AdMob çalışmaz
    if (isExpoGo || Platform.OS === 'web') {
      return;
    }

    try {
      const AdMobModule = await import('expo-ads-admob');
      setAdMobBanner(() => AdMobModule.AdMobBanner);
      
      // AdMob'u başlat
      await AdMobModule.setTestDeviceIDAsync('EMULATOR');
    } catch (error) {
      console.log('AdMob yüklenemedi:', error);
      setAdError(true);
    }
  };

  const getBannerAdUnitId = () => {
    if (testMode) {
      return AD_UNIT_IDS.test.banner;
    }
    return Platform.OS === 'ios' 
      ? AD_UNIT_IDS.ios.banner 
      : AD_UNIT_IDS.android.banner;
  };

  // Premium kullanıcılara reklam gösterme
  if (isPremium || loading) {
    return null;
  }

  // Expo Go veya Web'de placeholder göster
  if (isExpoGo || Platform.OS === 'web' || !AdMobBanner || adError) {
    return (
      <TouchableOpacity 
        style={[styles.placeholder, style]}
        onPress={() => router.push('/membership')}
        activeOpacity={0.8}
      >
        <View style={styles.placeholderContent}>
          <View style={styles.adHeader}>
            <Text style={styles.placeholderText}>📢 Reklam Alanı</Text>
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={12} color="#f59e0b" />
              <Text style={styles.premiumBadgeText}>Kaldır</Text>
            </View>
          </View>
          <Text style={styles.placeholderSubtext}>
            {Platform.OS === 'web' 
              ? 'Web\'de reklam desteklenmiyor' 
              : isExpoGo 
                ? 'EAS Build ile gerçek reklamlar gösterilecek'
                : 'Reklamsız deneyim için Premium\'a geçin'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // Gerçek AdMob Banner (EAS Build)
  return (
    <View style={[styles.adContainer, style]}>
      <AdMobBanner
        bannerSize="smartBannerPortrait"
        adUnitID={getBannerAdUnitId()}
        servePersonalizedAds={true}
        onDidFailToReceiveAdWithError={(error: string) => {
          console.log('AdMob error:', error);
          setAdError(true);
        }}
      />
      <TouchableOpacity 
        style={styles.removeBadge}
        onPress={() => router.push('/membership')}
      >
        <Ionicons name="diamond" size={10} color="#f59e0b" />
        <Text style={styles.removeBadgeText}>Kaldır</Text>
      </TouchableOpacity>
    </View>
  );
};

// Sabit yükseklikli banner wrapper
export const FixedBannerAd: React.FC<{ position?: 'top' | 'bottom' }> = ({ position = 'bottom' }) => {
  return (
    <View style={[
      styles.fixedContainer,
      position === 'top' ? styles.fixedTop : styles.fixedBottom
    ]}>
      <AdBanner />
    </View>
  );
};

const styles = StyleSheet.create({
  // Ad Container (Gerçek reklam)
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    position: 'relative',
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  removeBadgeText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '600',
  },

  // Placeholder (Expo Go / Web)
  placeholder: {
    height: 60,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
    overflow: 'hidden',
  },
  placeholderContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 8,
  },
  adHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  premiumBadgeText: {
    color: '#f59e0b',
    fontSize: 10,
    fontWeight: '600',
  },
  placeholderSubtext: {
    color: '#4b5563',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },

  // Fixed Container
  fixedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#0a0a0a',
    paddingVertical: 4,
  },
  fixedTop: {
    top: 0,
  },
  fixedBottom: {
    bottom: 0,
  },
});

export default AdBanner;
