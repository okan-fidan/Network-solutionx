import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo';

// Test Ad Unit IDs (Google'ın sağladığı test ID'leri)
const TEST_BANNER_ID_ANDROID = 'ca-app-pub-3940256099942544/6300978111';
const TEST_BANNER_ID_IOS = 'ca-app-pub-3940256099942544/2934735716';

// AdMob'u dinamik olarak import et (sadece native build'de)
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

// Native build'de AdMob'u yükle
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    const AdMob = require('react-native-google-mobile-ads');
    BannerAd = AdMob.BannerAd;
    BannerAdSize = AdMob.BannerAdSize;
    TestIds = AdMob.TestIds;
  } catch (e) {
    console.log('AdMob yüklenemedi:', e);
  }
}

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
  testMode?: boolean;
}

// Banner boyutlarını eşle
const getBannerSize = (size: AdBannerProps['size']) => {
  if (!BannerAdSize) return null;
  
  switch (size) {
    case 'largeBanner':
      return BannerAdSize.LARGE_BANNER;
    case 'mediumRectangle':
      return BannerAdSize.MEDIUM_RECTANGLE;
    case 'fullBanner':
      return BannerAdSize.FULL_BANNER;
    case 'leaderboard':
      return BannerAdSize.LEADERBOARD;
    case 'banner':
    default:
      return BannerAdSize.BANNER;
  }
};

/**
 * AdBanner Component
 * 
 * Web'de ve Expo Go'da placeholder gösterir.
 * Native build'de (EAS) gerçek AdMob reklamları gösterilir.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ 
  size = 'banner',
  style,
  testMode = true 
}) => {
  const [adError, setAdError] = useState<string | null>(null);
  const [adLoaded, setAdLoaded] = useState(false);

  // Web veya Expo Go'da hiçbir şey gösterme
  if (Platform.OS === 'web' || isExpoGo || !BannerAd) {
    return null;
  }

  // Native build'de gerçek reklam göster
  const adUnitId = testMode 
    ? (Platform.OS === 'ios' ? TEST_BANNER_ID_IOS : TEST_BANNER_ID_ANDROID)
    : (Platform.OS === 'ios' ? TEST_BANNER_ID_IOS : TEST_BANNER_ID_ANDROID); // Gerçek ID'leri buraya ekleyin

  return (
    <View style={[styles.adContainer, style]}>
      {adError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Reklam yüklenemedi</Text>
        </View>
      ) : (
        <BannerAd
          unitId={adUnitId}
          size={getBannerSize(size)}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => {
            console.log('Reklam yüklendi');
            setAdLoaded(true);
          }}
          onAdFailedToLoad={(error: any) => {
            console.log('Reklam yüklenemedi:', error);
            setAdError(error.message || 'Bilinmeyen hata');
          }}
        />
      )}
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
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  errorContainer: {
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  errorText: {
    color: '#6b7280',
    fontSize: 12,
  },
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
