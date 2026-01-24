import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationApi } from './api';
import Constants from 'expo-constants';

// Notification handler ayarları
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Push token kaydet
export async function registerForPushNotifications(): Promise<string | null> {
  let token: string | null = null;

  try {
    // Fiziksel cihaz kontrolü
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Mevcut izin durumunu kontrol et
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // İzin yoksa iste
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    // Expo Push Token al
    const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    
    token = tokenData.data;
    console.log('Push token obtained:', token);

    // Backend'e kaydet
    if (token) {
      try {
        await notificationApi.savePushToken(token);
        await AsyncStorage.setItem('push_token', token);
        console.log('Push token saved to backend');
      } catch (error) {
        console.error('Failed to save push token to backend:', error);
      }
    }

    // Android için channel ayarla
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Varsayılan',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366f1',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mesajlar',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10b981',
        sound: 'default',
      });

      await Notifications.setNotificationChannelAsync('social', {
        name: 'Sosyal',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

// Notification listener'ları kur
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Uygulama açıkken gelen bildirimler
  const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
    if (onNotificationReceived) {
      onNotificationReceived(notification);
    }
  });

  // Bildirime tıklandığında
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('Notification response:', response);
    const data = response.notification.request.content.data;
    
    if (onNotificationResponse) {
      onNotificationResponse(response);
    }
  });

  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

// Badge sayısını güncelle
export async function setBadgeCount(count: number) {
  try {
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    console.error('Error setting badge count:', error);
  }
}

// Lokal bildirim gönder (test için)
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null, // Hemen gönder
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
}

// Push token'ı al (cached)
export async function getPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem('push_token');
  } catch {
    return null;
  }
}

// Bildirim ayarlarını kontrol et
export async function checkNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export default {
  registerForPushNotifications,
  setupNotificationListeners,
  setBadgeCount,
  sendLocalNotification,
  getPushToken,
  checkNotificationPermissions,
};
