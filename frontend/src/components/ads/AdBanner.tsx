import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo';

// Test Ad Unit IDs (Production'da gerçek ID'lerle değiştirin)
const AD_UNIT_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111', // Test Banner
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716', // Test Banner
  },
};

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
  testMode?: boolean;
}

// Placeholder component for web and Expo Go
const PlaceholderAd: React.FC<{ style?: any }> = ({ style }) => (
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
            : 'AdMob yükleniyor...'}
      </Text>
    </View>
  </View>
);

// Native AdMob component - only loaded on native platforms
let NativeAdBanner: React.FC<AdBannerProps> | null = null;

// Only import AdMob on native platforms (not web, not Expo Go)
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    // Dynamic require to prevent web bundling
    const GoogleMobileAds = require('react-native-google-mobile-ads');
    const { BannerAd, BannerAdSize, TestIds } = GoogleMobileAds;
    
    const getBannerSize = (size: string) => {
      switch (size) {
        case 'largeBanner':
          return BannerAdSize.LARGE_BANNER;
        case 'mediumRectangle':
          return BannerAdSize.MEDIUM_RECTANGLE;
        case 'fullBanner':
          return BannerAdSize.FULL_BANNER;
        case 'leaderboard':
          return BannerAdSize.LEADERBOARD;
        default:
          return BannerAdSize.BANNER;
      }
    };

    NativeAdBanner = ({ size = 'banner', style, testMode = true }) => {
      const [adError, setAdError] = useState<string | null>(null);

      const adUnitId = testMode 
        ? TestIds.BANNER 
        : Platform.OS === 'android' 
          ? AD_UNIT_IDS.android.banner 
          : AD_UNIT_IDS.ios.banner;

      const bannerSize = getBannerSize(size);

      if (adError) {
        return (
          <View style={[styles.adContainer, style]}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Reklam yüklenemedi</Text>
            </View>
          </View>
        );
      }

      return (
        <View style={[styles.adContainer, style]}>
          <BannerAd
            unitId={adUnitId}
            size={bannerSize}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdLoaded={() => {
              console.log('Ad loaded successfully');
              setAdError(null);
            }}
            onAdFailedToLoad={(error: any) => {
              console.log('Ad failed to load:', error);
              setAdError(error.message || 'Ad load failed');
            }}
          />
        </View>
      );
    };
  } catch (error) {
    console.log('AdMob not available:', error);
    NativeAdBanner = null;
  }
}

/**
 * AdBanner Component
 * 
 * react-native-google-mobile-ads kullanarak AdMob reklamları gösterir.
 * Expo Go'da ve Web'de placeholder gösterir.
 */
export const AdBanner: React.FC<AdBannerProps> = (props) => {
  // Web veya Expo Go'da placeholder göster
  if (Platform.OS === 'web' || isExpoGo || !NativeAdBanner) {
    return <PlaceholderAd style={props.style} />;
  }

  // Native platformlarda gerçek AdMob göster
  return <NativeAdBanner {...props} />;
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
  // Ad Container
  adContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 50,
  },

  // Error Container
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#6b7280',
    fontSize: 12,
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
