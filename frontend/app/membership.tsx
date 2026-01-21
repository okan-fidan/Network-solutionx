import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function MembershipScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Üyelik</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Coming Soon Content */}
      <View style={styles.content}>
        <LinearGradient
          colors={['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.2)']}
          style={styles.comingSoonCard}
        >
          <View style={styles.iconContainer}>
            <Ionicons name="rocket" size={64} color="#8b5cf6" />
          </View>
          
          <Text style={styles.comingSoonTitle}>Yakında!</Text>
          <Text style={styles.comingSoonSubtitle}>
            Premium üyelik sistemi üzerinde çalışıyoruz.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>Reklamsız deneyim</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>Özel rozetler</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>Öncelikli destek</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              <Text style={styles.featureText}>Gelişmiş özellikler</Text>
            </View>
          </View>

          <View style={styles.notifyBox}>
            <Ionicons name="notifications-outline" size={24} color="#6366f1" />
            <Text style={styles.notifyText}>
              Hazır olduğunda size bildirim göndereceğiz!
            </Text>
          </View>
        </LinearGradient>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  comingSoonCard: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  comingSoonSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#d1d5db',
  },
  notifyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 12,
  },
  notifyText: {
    flex: 1,
    fontSize: 14,
    color: '#9ca3af',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#1f2937',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
