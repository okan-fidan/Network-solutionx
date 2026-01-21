import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

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

// Herkes için reklam gösterimi + AdMob entegrasyonu
export const AdBanner: React.FC<AdBannerProps> = ({ style, testMode = false }) => {
  const [AdMobBanner, setAdMobBanner] = useState<any>(null);
  const [adError, setAdError] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadAdMob();
  }, []);

  const loadAdMob = async () => {
    // Expo Go'da veya Web'de AdMob çalışmaz
    if (isExpoGo || Platform.OS === 'web') {
      setLoading(false);
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
    } finally {
      setLoading(false);
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

  // Yüklenirken gösterme
  if (loading) {
    return null;
  }

  // Expo Go veya Web'de placeholder göster
  if (isExpoGo || Platform.OS === 'web' || !AdMobBanner || adError) {
    return (
      <View style={[styles.placeholder, style]}>
        <View style={styles.placeholderContent}>
          <View style={styles.adHeader}>
            <Text style={styles.placeholderText}>📢 Reklam Alanı</Text>
          </View>
          <Text style={styles.placeholderSubtext}>
            {Platform.OS === 'web' 
              ? 'Web\'de reklam desteklenmiyor' 
              : isExpoGo 
                ? 'EAS Build ile gerçek reklamlar gösterilecek'
                : 'Reklam yükleniyor...'}
          </Text>
        </View>
      </View>
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
