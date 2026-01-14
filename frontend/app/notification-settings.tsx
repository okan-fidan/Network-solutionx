import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../src/services/api';

interface NotificationSettings {
  // Genel
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  
  // Mesajlar
  directMessages: boolean;
  groupMessages: boolean;
  mentions: boolean;
  
  // Aktivite
  likes: boolean;
  comments: boolean;
  newFollowers: boolean;
  
  // Topluluk
  announcements: boolean;
  events: boolean;
  newMembers: boolean;
  
  // Sessiz Saatler
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: false,
  soundEnabled: true,
  vibrationEnabled: true,
  directMessages: true,
  groupMessages: true,
  mentions: true,
  likes: true,
  comments: true,
  newFollowers: true,
  announcements: true,
  events: true,
  newMembers: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('notification_settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(newSettings));
      // Backend'e de kaydet
      await api.put('/api/user/notification-settings', newSettings).catch(() => {});
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const SettingRow = ({ 
    icon, 
    title, 
    subtitle, 
    value, 
    onValueChange,
    color = '#6366f1'
  }: { 
    icon: string; 
    title: string; 
    subtitle?: string;
    value: boolean; 
    onValueChange: (value: boolean) => void;
    color?: string;
  }) => (
    <View style={styles.settingRow}>
      <View style={[styles.settingIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#374151', true: '#6366f1' }}
        thumbColor="#fff"
      />
    </View>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Genel */}
        <SectionHeader title="Genel" />
        <View style={styles.section}>
          <SettingRow
            icon="notifications"
            title="Push Bildirimleri"
            subtitle="Anlık bildirimler al"
            value={settings.pushEnabled}
            onValueChange={(v) => updateSetting('pushEnabled', v)}
          />
          <SettingRow
            icon="mail"
            title="Email Bildirimleri"
            subtitle="Önemli güncellemeler için email al"
            value={settings.emailEnabled}
            onValueChange={(v) => updateSetting('emailEnabled', v)}
            color="#10b981"
          />
          <SettingRow
            icon="volume-high"
            title="Ses"
            subtitle="Bildirim sesi"
            value={settings.soundEnabled}
            onValueChange={(v) => updateSetting('soundEnabled', v)}
            color="#f59e0b"
          />
          <SettingRow
            icon="phone-portrait"
            title="Titreşim"
            subtitle="Titreşimli bildirim"
            value={settings.vibrationEnabled}
            onValueChange={(v) => updateSetting('vibrationEnabled', v)}
            color="#8b5cf6"
          />
        </View>

        {/* Mesajlar */}
        <SectionHeader title="Mesajlar" />
        <View style={styles.section}>
          <SettingRow
            icon="chatbubble"
            title="Direkt Mesajlar"
            subtitle="Birebir mesaj bildirimleri"
            value={settings.directMessages}
            onValueChange={(v) => updateSetting('directMessages', v)}
          />
          <SettingRow
            icon="chatbubbles"
            title="Grup Mesajları"
            subtitle="Grup sohbet bildirimleri"
            value={settings.groupMessages}
            onValueChange={(v) => updateSetting('groupMessages', v)}
            color="#10b981"
          />
          <SettingRow
            icon="at"
            title="Bahsetmeler"
            subtitle="Birisi sizi etiketlediğinde"
            value={settings.mentions}
            onValueChange={(v) => updateSetting('mentions', v)}
            color="#f59e0b"
          />
        </View>

        {/* Aktivite */}
        <SectionHeader title="Aktivite" />
        <View style={styles.section}>
          <SettingRow
            icon="heart"
            title="Beğeniler"
            subtitle="Gönderileriniz beğenildiğinde"
            value={settings.likes}
            onValueChange={(v) => updateSetting('likes', v)}
            color="#ef4444"
          />
          <SettingRow
            icon="chatbubble-outline"
            title="Yorumlar"
            subtitle="Gönderilerinize yorum yapıldığında"
            value={settings.comments}
            onValueChange={(v) => updateSetting('comments', v)}
            color="#3b82f6"
          />
          <SettingRow
            icon="person-add"
            title="Yeni Takipçiler"
            subtitle="Birisi sizi takip ettiğinde"
            value={settings.newFollowers}
            onValueChange={(v) => updateSetting('newFollowers', v)}
            color="#8b5cf6"
          />
        </View>

        {/* Topluluk */}
        <SectionHeader title="Topluluk" />
        <View style={styles.section}>
          <SettingRow
            icon="megaphone"
            title="Duyurular"
            subtitle="Topluluk duyuruları"
            value={settings.announcements}
            onValueChange={(v) => updateSetting('announcements', v)}
            color="#ec4899"
          />
          <SettingRow
            icon="calendar"
            title="Etkinlikler"
            subtitle="Yeni etkinlik bildirimleri"
            value={settings.events}
            onValueChange={(v) => updateSetting('events', v)}
            color="#14b8a6"
          />
          <SettingRow
            icon="people"
            title="Yeni Üyeler"
            subtitle="Topluluğa yeni üye katıldığında"
            value={settings.newMembers}
            onValueChange={(v) => updateSetting('newMembers', v)}
            color="#6b7280"
          />
        </View>

        {/* Sessiz Saatler */}
        <SectionHeader title="Sessiz Saatler" />
        <View style={styles.section}>
          <SettingRow
            icon="moon"
            title="Sessiz Saatler"
            subtitle={settings.quietHoursEnabled ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}` : 'Devre dışı'}
            value={settings.quietHoursEnabled}
            onValueChange={(v) => updateSetting('quietHoursEnabled', v)}
            color="#1f2937"
          />
          {settings.quietHoursEnabled && (
            <View style={styles.quietHoursInfo}>
              <Ionicons name="information-circle" size={18} color="#6b7280" />
              <Text style={styles.quietHoursText}>
                {settings.quietHoursStart} - {settings.quietHoursEnd} arası bildirimler sessize alınacak
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1 },
  sectionHeader: { color: '#9ca3af', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginTop: 24, marginBottom: 8, paddingHorizontal: 16 },
  section: { backgroundColor: '#111827', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  settingIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  settingInfo: { flex: 1 },
  settingTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  settingSubtitle: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  quietHoursInfo: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 8, backgroundColor: '#1f2937' },
  quietHoursText: { color: '#9ca3af', fontSize: 13, flex: 1 },
});
