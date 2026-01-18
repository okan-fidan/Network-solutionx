import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';

// Expo Go kontrolü - push notifications Expo Go'da desteklenmiyor
const isExpoGo = Constants.appOwnership === 'expo';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  timestamp: string;
}

export default function AllNotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    registerForPushNotifications();
    loadNotifications();

    // Bildirim dinleyicileri
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      loadNotifications();
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      handleNotificationNavigation(data);
    });

    // Uygulama aktif olduğunda yenile
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        loadNotifications();
      }
    });

    return () => {
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (error) {
        // Web'de desteklenmiyor, hata yoksay
      }
      subscription.remove();
    };
  }, []);

  const registerForPushNotifications = async () => {
    try {
      if (!Device.isDevice) {
        console.log('Push notifications need a physical device');
        return;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // Expo project ID
      });

      setPushEnabled(true);

      // Token'ı backend'e kaydet
      if (token?.data) {
        await api.post('/api/user/push-token', { token: token.data });
      }

      // Android için kanal ayarı
      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366f1',
        });
      }
    } catch (error) {
      console.error('Push notification registration error:', error);
    }
  };

  const handleNotificationNavigation = (data: any) => {
    if (data?.type === 'message' && data?.groupId) {
      router.push(`/chat/group/${data.groupId}`);
    } else if (data?.type === 'post' && data?.postId) {
      router.push(`/post/${data.postId}`);
    } else if (data?.type === 'community' && data?.communityId) {
      router.push(`/community/${data.communityId}`);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await api.get('/api/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications();
  }, []);

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.isRead) {
      handleNotificationNavigation(notification.data);
      return;
    }

    try {
      await api.post(`/api/notifications/mark-read/${notification.id}`);
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
      handleNotificationNavigation(notification.data);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/api/notifications/mark-all-read');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      Alert.alert('Başarılı', 'Tüm bildirimler okundu işaretlendi');
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Tüm Bildirimleri Sil',
      'Tüm bildirimler silinecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete('/api/notifications');
              setNotifications([]);
              setUnreadCount(0);
            } catch (error) {
              console.error('Error clearing notifications:', error);
            }
          }
        }
      ]
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message': return 'chatbubble';
      case 'mention': return 'at';
      case 'like': return 'heart';
      case 'comment': return 'chatbubble-outline';
      case 'follow': return 'person-add';
      case 'announcement': return 'megaphone';
      case 'event': return 'calendar';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message': return '#6366f1';
      case 'mention': return '#f59e0b';
      case 'like': return '#ef4444';
      case 'comment': return '#10b981';
      case 'follow': return '#3b82f6';
      case 'announcement': return '#8b5cf6';
      case 'event': return '#ec4899';
      default: return '#6b7280';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: tr });
    } catch {
      return '';
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.isRead && styles.unreadCard]}
      onPress={() => handleMarkAsRead(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) + '20' }]}>
        <Ionicons name={getNotificationIcon(item.type) as any} size={22} color={getNotificationColor(item.type)} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{item.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>{item.message}</Text>
        <Text style={styles.notificationTime}>{formatTime(item.timestamp)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Ionicons name="trash-outline" size={22} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {unreadCount > 0 && (
        <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllRead}>
          <Ionicons name="checkmark-done" size={18} color="#6366f1" />
          <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
        </TouchableOpacity>
      )}

      {!pushEnabled && (
        <View style={styles.pushWarning}>
          <Ionicons name="notifications-off" size={20} color="#f59e0b" />
          <Text style={styles.pushWarningText}>Push bildirimleri kapalı</Text>
          <TouchableOpacity onPress={registerForPushNotifications}>
            <Text style={styles.enableText}>Etkinleştir</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#6366f1"
            colors={['#6366f1']}
          />
        }
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-outline" size={64} color="#374151" />
            </View>
            <Text style={styles.emptyTitle}>Bildirim Yok</Text>
            <Text style={styles.emptySubtitle}>Yeni bildirimler burada görünecek</Text>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  badge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  clearButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  markAllButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', gap: 8 },
  markAllText: { color: '#6366f1', fontSize: 14, fontWeight: '500' },
  pushWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937', paddingVertical: 10, paddingHorizontal: 16, gap: 8 },
  pushWarningText: { color: '#f59e0b', fontSize: 13 },
  enableText: { color: '#6366f1', fontSize: 13, fontWeight: '600' },
  listContent: { paddingVertical: 8 },
  notificationCard: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  unreadCard: { backgroundColor: 'rgba(99, 102, 241, 0.05)' },
  iconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  notificationContent: { flex: 1 },
  notificationTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  notificationMessage: { color: '#9ca3af', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  notificationTime: { color: '#6b7280', fontSize: 12 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: '#6b7280', fontSize: 15 },
});
