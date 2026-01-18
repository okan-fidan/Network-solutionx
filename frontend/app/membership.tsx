import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { membershipApi } from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';
import Toast from 'react-native-toast-message';

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  priceText: string;
  originalPrice?: number;
  discount?: string;
  duration: string;
  features: string[];
  highlighted: boolean;
}

interface MembershipStatus {
  type: string;
  isActive: boolean;
  isPremium: boolean;
  expiresAt: string | null;
  showAds: boolean;
}

export default function MembershipScreen() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [plansRes, statusRes] = await Promise.all([
        membershipApi.getPlans(),
        membershipApi.getStatus(),
      ]);
      setPlans(plansRes.data.plans || []);
      setTestMode(plansRes.data.testMode || false);
      setStatus(statusRes.data);
    } catch (error) {
      console.error('Error loading membership data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (planId: string) => {
    if (!user) {
      Alert.alert('Giriş Gerekli', 'Satın almak için giriş yapmalısınız.');
      return;
    }

    if (planId === 'free') {
      Toast.show({
        type: 'info',
        text1: 'Zaten Ücretsiz Plan',
        text2: 'Ücretsiz planı kullanıyorsunuz.',
      });
      return;
    }

    setPurchasing(true);
    try {
      const response = await membershipApi.purchase(planId);
      
      if (response.data.testMode) {
        // Test modunda - direkt onay iste
        Alert.alert(
          '🧪 Test Modu',
          'Bu bir test satın almasıdır. Gerçek ödeme yapılmayacak.\n\nPremium üyeliği aktifleştirmek ister misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Aktifleştir',
              onPress: async () => {
                try {
                  await membershipApi.confirmTest(response.data.orderId);
                  Toast.show({
                    type: 'success',
                    text1: '🎉 Premium Aktif!',
                    text2: 'Premium üyeliğiniz başarıyla aktifleştirildi.',
                  });
                  loadData(); // Durumu yenile
                } catch (err) {
                  Toast.show({
                    type: 'error',
                    text1: 'Hata',
                    text2: 'Üyelik aktifleştirilemedi.',
                  });
                }
              },
            },
          ]
        );
      } else {
        // Production - PayTR ödeme sayfasına yönlendir
        // Bu kısım gerçek entegrasyonda WebView ile yapılacak
        Alert.alert('Ödeme', 'PayTR ödeme sayfasına yönlendiriliyorsunuz...');
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Satın alma başlatılamadı.',
      });
    } finally {
      setPurchasing(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Üyelik</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Test Mode Banner */}
        {testMode && (
          <View style={styles.testModeBanner}>
            <Ionicons name="flask" size={20} color="#f59e0b" />
            <Text style={styles.testModeText}>Test Modu Aktif - Gerçek ödeme yapılmayacak</Text>
          </View>
        )}

        {/* Current Status */}
        {status && (
          <View style={styles.statusCard}>
            <LinearGradient
              colors={status.isPremium ? ['#6366f1', '#8b5cf6'] : ['#374151', '#1f2937']}
              style={styles.statusGradient}
            >
              <View style={styles.statusHeader}>
                <View style={styles.statusBadge}>
                  <Ionicons 
                    name={status.isPremium ? 'diamond' : 'person'} 
                    size={24} 
                    color="#fff" 
                  />
                </View>
                <View>
                  <Text style={styles.statusTitle}>
                    {status.isPremium ? 'Premium Üye' : 'Ücretsiz Üye'}
                  </Text>
                  {status.isPremium && status.expiresAt && (
                    <Text style={styles.statusExpiry}>
                      {formatDate(status.expiresAt)} tarihine kadar geçerli
                    </Text>
                  )}
                </View>
              </View>
              {status.isPremium && (
                <View style={styles.premiumFeatures}>
                  <View style={styles.featureTag}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureTagText}>Reklamsız</Text>
                  </View>
                  <View style={styles.featureTag}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.featureTagText}>Öncelikli Destek</Text>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Plans */}
        <Text style={styles.sectionTitle}>Üyelik Planları</Text>
        
        {plans.map((plan) => (
          <View 
            key={plan.id} 
            style={[
              styles.planCard, 
              plan.highlighted && styles.planCardHighlighted
            ]}
          >
            {plan.highlighted && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>En Popüler</Text>
              </View>
            )}
            
            {plan.discount && (
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{plan.discount}</Text>
              </View>
            )}

            <View style={styles.planHeader}>
              <View>
                <Text style={styles.planName}>{plan.name}</Text>
                <View style={styles.priceRow}>
                  {plan.originalPrice && (
                    <Text style={styles.originalPrice}>{plan.originalPrice}₺</Text>
                  )}
                  <Text style={styles.planPrice}>{plan.priceText}</Text>
                </View>
              </View>
              <View style={[
                styles.planIcon,
                plan.id === 'free' ? styles.planIconFree : styles.planIconPremium
              ]}>
                <Ionicons 
                  name={plan.id === 'free' ? 'person-outline' : 'diamond'} 
                  size={28} 
                  color={plan.id === 'free' ? '#9ca3af' : '#fff'} 
                />
              </View>
            </View>

            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons 
                    name="checkmark-circle" 
                    size={20} 
                    color={plan.id === 'free' ? '#6b7280' : '#10b981'} 
                  />
                  <Text style={[
                    styles.featureText,
                    plan.id === 'free' && styles.featureTextFree
                  ]}>
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.purchaseButton,
                plan.id === 'free' && styles.purchaseButtonFree,
                (status?.isPremium && plan.id !== 'free') && styles.purchaseButtonDisabled
              ]}
              onPress={() => handlePurchase(plan.id)}
              disabled={purchasing || (status?.isPremium && plan.id !== 'free')}
            >
              {purchasing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[
                  styles.purchaseButtonText,
                  plan.id === 'free' && styles.purchaseButtonTextFree
                ]}>
                  {status?.isPremium && plan.id !== 'free' 
                    ? 'Aktif' 
                    : plan.id === 'free' 
                      ? 'Mevcut Plan' 
                      : 'Satın Al'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}

        {/* Info */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Premium üyelik tek seferlik ödemedir. Abonelik otomatik yenilenmez.
            İstediğiniz zaman manuel olarak yenileyebilirsiniz.
          </Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethods}>
          <Text style={styles.paymentTitle}>Güvenli Ödeme</Text>
          <View style={styles.paymentIcons}>
            <View style={styles.paymentIcon}>
              <Ionicons name="card-outline" size={24} color="#6b7280" />
              <Text style={styles.paymentLabel}>Kredi Kartı</Text>
            </View>
            <View style={styles.paymentIcon}>
              <Ionicons name="phone-portrait-outline" size={24} color="#6b7280" />
              <Text style={styles.paymentLabel}>Mobil Ödeme</Text>
            </View>
            <View style={styles.paymentIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#6b7280" />
              <Text style={styles.paymentLabel}>3D Secure</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },

  // Test Mode
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  testModeText: { color: '#f59e0b', fontSize: 13, flex: 1 },

  // Status Card
  statusCard: { marginBottom: 24, borderRadius: 16, overflow: 'hidden' },
  statusGradient: { padding: 20 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  statusExpiry: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  premiumFeatures: { flexDirection: 'row', gap: 12, marginTop: 16 },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  featureTagText: { color: '#fff', fontSize: 13 },

  // Section
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 16 },

  // Plan Card
  planCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  planCardHighlighted: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    backgroundColor: '#6366f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  discountBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  originalPrice: { color: '#6b7280', fontSize: 14, textDecorationLine: 'line-through' },
  planPrice: { color: '#10b981', fontSize: 22, fontWeight: '700' },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planIconFree: { backgroundColor: '#374151' },
  planIconPremium: { backgroundColor: '#6366f1' },

  // Features
  featuresList: { marginBottom: 16 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  featureText: { color: '#fff', fontSize: 14, flex: 1 },
  featureTextFree: { color: '#9ca3af' },

  // Purchase Button
  purchaseButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  purchaseButtonFree: { backgroundColor: '#374151' },
  purchaseButtonDisabled: { backgroundColor: '#10b981' },
  purchaseButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  purchaseButtonTextFree: { color: '#9ca3af' },

  // Info Section
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  infoText: { color: '#9ca3af', fontSize: 13, flex: 1, lineHeight: 20 },

  // Payment Methods
  paymentMethods: { alignItems: 'center', marginBottom: 40 },
  paymentTitle: { color: '#6b7280', fontSize: 13, marginBottom: 16 },
  paymentIcons: { flexDirection: 'row', gap: 24 },
  paymentIcon: { alignItems: 'center', gap: 6 },
  paymentLabel: { color: '#6b7280', fontSize: 11 },
});
