import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo';

// Test Ad Unit IDs (Production'da gerçek ID'lerle değiştirin)
const AD_UNIT_IDS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
  },
};

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
  testMode?: boolean;
}

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

// Placeholder for Expo Go
const PlaceholderAd: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.placeholder, style]}>
    <View style={styles.placeholderContent}>
      <View style={styles.adHeader}>
        <Text style={styles.placeholderText}>📢 Reklam Alanı</Text>
      </View>
      <Text style={styles.placeholderSubtext}>
        EAS Build ile gerçek reklamlar gösterilecek
      </Text>
    </View>
  </View>
);

export const AdBanner: React.FC<AdBannerProps> = ({ 
  size = 'banner', 
  style,
  testMode = true 
}) => {
  const [adError, setAdError] = useState<string | null>(null);

  // Expo Go'da placeholder göster
  if (isExpoGo) {
    return <PlaceholderAd style={style} />;
  }

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
        onAdFailedToLoad={(error) => {
          console.log('Ad failed to load:', error);
          setAdError(error.message || 'Ad load failed');
        }}
      />
    </View>
  );
};

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
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 50,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#6b7280',
    fontSize: 12,
  },
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
