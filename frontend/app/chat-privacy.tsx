/**
 * Gizlilik Ayarları Sayfası
 * Son görülme, okundu bilgisi vb.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatSettings } from '../src/contexts/ChatSettingsContext';

export default function ChatPrivacySettingsScreen() {
  const router = useRouter();
  const { privacySettings, updatePrivacySettings } = useChatSettings();

  const lastSeenOptions = [
    { value: 'everyone', label: 'Herkes', icon: 'globe' },
    { value: 'contacts', label: 'Sadece Kişilerim', icon: 'people' },
    { value: 'nobody', label: 'Kimse', icon: 'lock-closed' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gizlilik Ayarları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Son Görülme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son Görülme</Text>
          <Text style={styles.sectionDescription}>
            Son görülme durumunuzu kim görebilir?
          </Text>
          <View style={styles.optionsContainer}>
            {lastSeenOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionButton,
                  privacySettings.lastSeen === option.value && styles.optionButtonActive,
                ]}
                onPress={() => updatePrivacySettings({ lastSeen: option.value as any })}
              >
                <Ionicons
                  name={option.icon as any}
                  size={24}
                  color={privacySettings.lastSeen === option.value ? '#6366f1' : '#6b7280'}
                />
                <Text
                  style={[
                    styles.optionText,
                    privacySettings.lastSeen === option.value && styles.optionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
                {privacySettings.lastSeen === option.value && (
                  <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Okundu Bilgisi */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="checkmark-done" size={24} color="#3b82f6" />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Okundu Bilgisi</Text>
                <Text style={styles.toggleSubtitle}>
                  Mesajları okuduğunuzda mavi tik gösterilsin
                </Text>
              </View>
            </View>
            <Switch
              value={privacySettings.readReceipts}
              onValueChange={(value) => updatePrivacySettings({ readReceipts: value })}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>
          {!privacySettings.readReceipts && (
            <View style={styles.warningBox}>
              <Ionicons name="information-circle" size={18} color="#f59e0b" />
              <Text style={styles.warningText}>
                Bu ayarı kapattığınızda, siz de başkalarının okundu bilgisini göremezsiniz.
              </Text>
            </View>
          )}
        </View>

        {/* Çevrimiçi Durumu */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <View style={[styles.toggleIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="ellipse" size={24} color="#10b981" />
              </View>
              <View style={styles.toggleText}>
                <Text style={styles.toggleTitle}>Çevrimiçi Durumu</Text>
                <Text style={styles.toggleSubtitle}>
                  Çevrimiçi olduğunuzda gösterilsin
                </Text>
              </View>
            </View>
            <Switch
              value={privacySettings.showOnlineStatus}
              onValueChange={(value) => updatePrivacySettings({ showOnlineStatus: value })}
              trackColor={{ false: '#374151', true: '#6366f1' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Bilgilendirme */}
        <View style={styles.infoSection}>
          <Ionicons name="shield-checkmark" size={32} color="#6366f1" />
          <Text style={styles.infoTitle}>Gizliliğiniz Bizim İçin Önemli</Text>
          <Text style={styles.infoText}>
            Bu ayarlar sadece sizin için geçerlidir. Diğer kullanıcılar bu tercihlerinizi göremez.
          </Text>
        </View>
      </ScrollView>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: '#9ca3af',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleText: {
    flex: 1,
    marginLeft: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#f59e0b',
    lineHeight: 18,
  },
  infoSection: {
    alignItems: 'center',
    padding: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
