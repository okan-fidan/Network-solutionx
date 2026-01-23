import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

interface NotificationSettings {
  messages: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  mentions: boolean;
  events: boolean;
  announcements: boolean;
  emailNotifications: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    messages: true,
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    events: true,
    announcements: true,
    emailNotifications: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.get('/api/user/notification-settings');
      setSettings({ ...settings, ...response.data });
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    setSaving(true);
    try {
      await api.put('/api/user/notification-settings', newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    saveSettings(newSettings);
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
        <Text style={styles.headerTitle}>Bildirim Ayarları</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bildirim Türleri */}
        <Text style={styles.sectionTitle}>Bildirim Türleri</Text>
        <View style={styles.section}>
          <SettingItem
            icon="chatbubble"
            iconColor="#10b981"
            title="Mesajlar"
            description="Yeni mesaj bildirimleri"
            value={settings.messages}
            onToggle={() => toggleSetting('messages')}
          />
          <SettingItem
            icon="heart"
            iconColor="#ef4444"
            title="Beğeniler"
            description="Gönderilerinize gelen beğeniler"
            value={settings.likes}
            onToggle={() => toggleSetting('likes')}
          />
          <SettingItem
            icon="chatbubble-ellipses"
            iconColor="#3b82f6"
            title="Yorumlar"
            description="Gönderilerinize gelen yorumlar"
            value={settings.comments}
            onToggle={() => toggleSetting('comments')}
          />
          <SettingItem
            icon="person-add"
            iconColor="#8b5cf6"
            title="Takipler"
            description="Yeni takipçi bildirimleri"
            value={settings.follows}
            onToggle={() => toggleSetting('follows')}
          />
          <SettingItem
            icon="at"
            iconColor="#f59e0b"
            title="Bahsetmeler"
            description="Sizden bahsedildiğinde"
            value={settings.mentions}
            onToggle={() => toggleSetting('mentions')}
          />
          <SettingItem
            icon="calendar"
            iconColor="#ec4899"
            title="Etkinlikler"
            description="Yeni etkinlik bildirimleri"
            value={settings.events}
            onToggle={() => toggleSetting('events')}
          />
          <SettingItem
            icon="megaphone"
            iconColor="#06b6d4"
            title="Duyurular"
            description="Topluluk duyuruları"
            value={settings.announcements}
            onToggle={() => toggleSetting('announcements')}
            isLast
          />
        </View>

        {/* Email Bildirimleri */}
        <Text style={styles.sectionTitle}>Email Bildirimleri</Text>
        <View style={styles.section}>
          <SettingItem
            icon="mail"
            iconColor="#6366f1"
            title="Email Özeti"
            description="Günlük/haftalık email özeti"
            value={settings.emailNotifications}
            onToggle={() => toggleSetting('emailNotifications')}
            isLast
          />
        </View>

        {/* Sessiz Saatler */}
        <Text style={styles.sectionTitle}>Sessiz Saatler</Text>
        <View style={styles.section}>
          <SettingItem
            icon="moon"
            iconColor="#9ca3af"
            title="Sessiz Mod"
            description={settings.quietHoursEnabled 
              ? `${settings.quietHoursStart} - ${settings.quietHoursEnd} arası bildirim yok`
              : "Belirli saatlerde bildirimleri sustur"
            }
            value={settings.quietHoursEnabled}
            onToggle={() => toggleSetting('quietHoursEnabled')}
            isLast
          />
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color="#6b7280" />
          <Text style={styles.infoText}>
            Bildirim ayarlarınız anlık olarak kaydedilir. Değişiklikler hemen uygulanır.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Setting Item Component
const SettingItem = ({ 
  icon, 
  iconColor, 
  title, 
  description, 
  value, 
  onToggle,
  isLast = false 
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  value: boolean;
  onToggle: () => void;
  isLast?: boolean;
}) => (
  <View style={[styles.settingItem, !isLast && styles.settingItemBorder]}>
    <View style={[styles.settingIcon, { backgroundColor: iconColor + '20' }]}>
      <Ionicons name={icon} size={20} color={iconColor} />
    </View>
    <View style={styles.settingContent}>
      <Text style={styles.settingTitle}>{title}</Text>
      <Text style={styles.settingDescription}>{description}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: '#374151', true: '#6366f1' }}
      thumbColor={value ? '#fff' : '#9ca3af'}
    />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1f293750',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#9ca3af',
    lineHeight: 20,
  },
});
