import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { membershipApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface AdBannerProps {
  size?: 'banner' | 'largeBanner' | 'mediumRectangle' | 'fullBanner' | 'leaderboard';
  style?: any;
}

// Premium kullanıcılar için reklam gizleme
export const AdBanner: React.FC<AdBannerProps> = ({ style }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    checkMembership();
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
      // Hata durumunda reklam göster
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  };

  // Premium kullanıcılara reklam gösterme
  if (isPremium || loading) {
    return null;
  }

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
            ? 'Premium üye olarak reklamsız kullanın' 
            : 'Reklamsız deneyim için tıklayın'}
        </Text>
      </View>
    </TouchableOpacity>
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
