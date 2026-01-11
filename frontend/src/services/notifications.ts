import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import api from './api';

// Notification handler ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Push notification token al
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Push notification izni verilmedi!');
      return null;
    }
    
    // Expo push token al
    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID || 'your-project-id',
    });
    token = tokenResponse.data;
  } else {
    console.log('Push notifications sadece fiziksel cihazlarda çalışır');
  }

  return token;
}

// Token'ı backend'e kaydet
export async function savePushToken(token: string): Promise<void> {
  try {
    await api.post('/user/push-token', { token });
    console.log('Push token kaydedildi');
  } catch (error) {
    console.error('Push token kaydedilemedi:', error);
  }
}

// Yerel bildirim gönder
export async function sendLocalNotification(title: string, body: string, data?: object): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null, // Hemen göster
  });
}

// Bildirim listener'ları
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Badge sayısını güncelle
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

// Tüm bildirimleri temizle
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}

export default {
  registerForPushNotificationsAsync,
  savePushToken,
  sendLocalNotification,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  setBadgeCount,
  clearAllNotifications,
};
