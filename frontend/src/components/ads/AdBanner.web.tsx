import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
  testMode?: boolean;
}

/**
 * AdBanner Component - Web Version (Placeholder)
 * Web'de AdMob desteklenmediği için placeholder gösterir.
 */
export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  return (
    <View style={[styles.placeholder, style]}>
      <View style={styles.placeholderContent}>
        <View style={styles.adHeader}>
          <Text style={styles.placeholderText}>📢 Reklam Alanı</Text>
        </View>
        <Text style={styles.placeholderSubtext}>
          Web'de reklam desteklenmiyor
        </Text>
      </View>
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
