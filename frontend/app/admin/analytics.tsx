import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import api from '../../src/services/api';

const { width } = Dimensions.get('window');

interface AnalyticsDashboard {
  dau: { _id: string; uniqueUsers: number }[];
  eventCounts: { _id: string; count: number }[];
  totalUsers: number;
  activeUsers24h: number;
  newUsersLast7Days: number;
  generatedAt: string;
}

export default function AnalyticsScreen() {
  const [dashboard, setDashboard] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/analytics/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const eventIcons: Record<string, string> = {
    'screen_view': 'eye-outline',
    'user_login': 'log-in-outline',
    'user_logout': 'log-out-outline',
    'post_create': 'create-outline',
    'post_like': 'heart-outline',
    'message_send': 'chatbubble-outline',
    'community_join': 'people-outline',
    'profile_view': 'person-outline',
    'search': 'search-outline',
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Özet Kartları */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#6366f1' }]}>
            <Ionicons name="people" size={32} color="#fff" />
            <Text style={styles.statNumber}>{dashboard?.totalUsers || 0}</Text>
            <Text style={styles.statLabel}>Toplam Kullanıcı</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
            <Ionicons name="pulse" size={32} color="#fff" />
            <Text style={styles.statNumber}>{dashboard?.activeUsers24h || 0}</Text>
            <Text style={styles.statLabel}>Aktif (24s)</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="person-add" size={32} color="#fff" />
            <Text style={styles.statNumber}>{dashboard?.newUsersLast7Days || 0}</Text>
            <Text style={styles.statLabel}>Yeni (7 gün)</Text>
          </View>
        </View>

        {/* DAU Grafiği */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Günlük Aktif Kullanıcılar (DAU)</Text>
          <View style={styles.chartContainer}>
            {dashboard?.dau && dashboard.dau.length > 0 ? (
              <View style={styles.barChart}>
                {dashboard.dau.map((item, index) => {
                  const maxValue = Math.max(...dashboard.dau.map(d => d.uniqueUsers));
                  const height = maxValue > 0 ? (item.uniqueUsers / maxValue) * 100 : 0;
                  return (
                    <View key={item._id} style={styles.barContainer}>
                      <View style={[styles.bar, { height: `${height}%` }]}>
                        <Text style={styles.barValue}>{item.uniqueUsers}</Text>
                      </View>
                      <Text style={styles.barLabel}>{item._id.slice(5)}</Text>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Ionicons name="analytics-outline" size={48} color="#4b5563" />
                <Text style={styles.emptyText}>Henüz veri yok</Text>
              </View>
            )}
          </View>
        </View>

        {/* Event İstatistikleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>En Çok Yapılan İşlemler</Text>
          <View style={styles.eventsList}>
            {dashboard?.eventCounts && dashboard.eventCounts.length > 0 ? (
              dashboard.eventCounts.map((event, index) => (
                <View key={event._id} style={styles.eventItem}>
                  <View style={styles.eventRank}>
                    <Text style={styles.eventRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.eventIcon}>
                    <Ionicons 
                      name={(eventIcons[event._id] || 'ellipse-outline') as any} 
                      size={20} 
                      color="#a5b4fc" 
                    />
                  </View>
                  <Text style={styles.eventName}>{event._id}</Text>
                  <Text style={styles.eventCount}>{event.count}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyEvents}>
                <Text style={styles.emptyText}>Henüz event kaydı yok</Text>
              </View>
            )}
          </View>
        </View>

        {/* Son Güncelleme */}
        <View style={styles.footer}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.footerText}>
            Son güncelleme: {dashboard?.generatedAt ? new Date(dashboard.generatedAt).toLocaleString('tr-TR') : '-'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    height: 200,
  },
  barChart: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    gap: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '80%',
    backgroundColor: '#6366f1',
    borderRadius: 8,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 4,
    minHeight: 20,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  barLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 6,
  },
  emptyChart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
  },
  eventsList: {
    backgroundColor: '#111827',
    borderRadius: 16,
    overflow: 'hidden',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 12,
  },
  eventRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9ca3af',
  },
  eventIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventName: {
    flex: 1,
    fontSize: 14,
    color: '#e5e7eb',
  },
  eventCount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  emptyEvents: {
    padding: 32,
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
