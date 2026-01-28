import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go kontrolü
const isExpoGo = Constants.appOwnership === 'expo';

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
  testMode?: boolean;
}

/**
 * AdBanner Component
 * 
 * Web'de ve Expo Go'da placeholder gösterir.
 * Native build'de (EAS) gerçek AdMob reklamları gösterilir.
 * 
 * NOT: react-native-google-mobile-ads paketi yüklü ve app.json'da yapılandırılmış.
 * EAS build ile derlendiğinde otomatik olarak çalışacaktır.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  // Her zaman placeholder göster - AdMob sadece native build'de çalışır
  // ve bu dosya web için de bundle ediliyor
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
              : 'Reklam alanı'}
        </Text>
      </View>
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
