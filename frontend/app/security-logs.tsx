import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../src/services/api';

interface SecurityLog {
  id: string;
  eventType: string;
  metadata: any;
  timestamp: string;
  ip?: string;
  userAgent?: string;
}

const EVENT_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  '2fa_setup_started': { label: '2FA Kurulumu Başlatıldı', icon: 'shield', color: '#3b82f6' },
  '2fa_enabled': { label: '2FA Aktif Edildi', icon: 'shield-checkmark', color: '#10b981' },
  '2fa_disabled': { label: '2FA Devre Dışı', icon: 'shield-outline', color: '#f59e0b' },
  '2fa_verify_failed': { label: '2FA Doğrulama Başarısız', icon: 'close-circle', color: '#ef4444' },
  '2fa_login_success': { label: '2FA ile Giriş', icon: 'log-in', color: '#10b981' },
  '2fa_login_failed': { label: '2FA Giriş Başarısız', icon: 'log-in-outline', color: '#ef4444' },
  '2fa_backup_code_used': { label: 'Yedek Kod Kullanıldı', icon: 'key', color: '#f59e0b' },
  'login_success': { label: 'Giriş Yapıldı', icon: 'log-in', color: '#10b981' },
  'login_failed': { label: 'Giriş Başarısız', icon: 'log-in-outline', color: '#ef4444' },
  'logout': { label: 'Çıkış Yapıldı', icon: 'log-out', color: '#6b7280' },
  'password_changed': { label: 'Şifre Değiştirildi', icon: 'key', color: '#3b82f6' },
  'user_reported': { label: 'Kullanıcı Raporlandı', icon: 'flag', color: '#f59e0b' },
  'content_reported': { label: 'İçerik Raporlandı', icon: 'flag', color: '#f59e0b' },
  'report_updated': { label: 'Rapor Güncellendi', icon: 'create', color: '#6366f1' },
  'rate_limit_exceeded': { label: 'Rate Limit Aşıldı', icon: 'warning', color: '#ef4444' },
  'unauthorized_access': { label: 'Yetkisiz Erişim Denemesi', icon: 'alert-circle', color: '#ef4444' },
};

export default function SecurityLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      const response = await api.get('/api/security/logs');
      setLogs(response.data || []);
    } catch (error) {
      console.error('Error loading security logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadLogs();
  }, [loadLogs]);

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: tr });
    } catch {
      return '';
    }
  };

  const getEventConfig = (eventType: string) => {
    return EVENT_CONFIG[eventType] || { 
      label: eventType.replace(/_/g, ' '), 
      icon: 'information-circle', 
      color: '#6b7280' 
    };
  };

  const renderLog = ({ item }: { item: SecurityLog }) => {
    const config = getEventConfig(item.eventType);
    
    return (
      <View style={styles.logCard}>
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon as any} size={22} color={config.color} />
        </View>
        <View style={styles.logContent}>
          <Text style={styles.logTitle}>{config.label}</Text>
          {item.metadata && Object.keys(item.metadata).length > 0 && (
            <Text style={styles.logMetadata} numberOfLines={1}>
              {JSON.stringify(item.metadata).slice(0, 50)}
            </Text>
          )}
          <View style={styles.logFooter}>
            <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
            {item.ip && (
              <Text style={styles.logIp}>IP: {item.ip}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Güvenlik Geçmişi</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="information-circle" size={18} color="#6366f1" />
        <Text style={styles.infoText}>
          Son 50 güvenlik olayı gösteriliyor
        </Text>
      </View>

      <FlatList
        data={logs}
        renderItem={renderLog}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        contentContainerStyle={logs.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield-checkmark-outline" size={64} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>Güvenlik Olayı Yok</Text>
            <Text style={styles.emptySubtitle}>Hesabınızda henüz güvenlik olayı kaydedilmemiş</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  infoBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: '#1f2937', gap: 8 },
  infoText: { color: '#9ca3af', fontSize: 13 },
  listContent: { paddingVertical: 8 },
  logCard: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logContent: { flex: 1 },
  logTitle: { color: '#fff', fontSize: 15, fontWeight: '500', marginBottom: 4 },
  logMetadata: { color: '#6b7280', fontSize: 13, marginBottom: 6 },
  logFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logTime: { color: '#6b7280', fontSize: 12 },
  logIp: { color: '#4b5563', fontSize: 11 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#6b7280', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
});
