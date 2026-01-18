import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Expo Go'da push notifications desteklenmiyor
// Bu dosya sadece development build ve production için çalışır
const isExpoGo = Constants.appOwnership === 'expo';

// Lazy import - sadece ihtiyaç olduğunda yükle
let Notifications: any = null;
let Device: any = null;

// Notifications modülünü güvenli şekilde yükle
const loadNotificationsModule = async () => {
  if (isExpoGo) {
    console.log('Push notifications Expo Go\'da desteklenmiyor');
    return false;
  }
  
  try {
    if (!Notifications) {
      Notifications = await import('expo-notifications');
      Device = await import('expo-device');
      
      // Notification handler ayarları
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    }
    return true;
  } catch (error) {
    console.log('Notifications modülü yüklenemedi:', error);
    return false;
  }
};

// Push notification token al
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Expo Go'da çalışmaz
  if (isExpoGo) {
    console.log('Push notifications Expo Go\'da desteklenmiyor - Development build kullanın');
    return null;
  }

  try {
    const loaded = await loadNotificationsModule();
    if (!loaded || !Notifications || !Device) return null;

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
      
      try {
        const tokenResponse = await Notifications.getExpoPushTokenAsync();
        token = tokenResponse.data;
      } catch (tokenError) {
        console.log('Push token alınamadı');
        return null;
      }
    } else {
      console.log('Push notifications sadece fiziksel cihazlarda çalışır');
    }

    return token;
  } catch (error) {
    console.log('Push notification setup hatası:', error);
    return null;
  }
}

// Token'ı backend'e kaydet
export async function savePushToken(token: string): Promise<void> {
  try {
    const { default: api } = await import('./api');
    await api.post('/api/user/push-token', { token });
    console.log('Push token kaydedildi');
  } catch (error) {
    console.log('Push token kaydedilemedi');
  }
}

// Yerel bildirim gönder
export async function sendLocalNotification(title: string, body: string, data?: object): Promise<void> {
  if (isExpoGo) return;
  
  try {
    const loaded = await loadNotificationsModule();
    if (!loaded || !Notifications) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  } catch (error) {
    console.log('Yerel bildirim gönderilemedi');
  }
}

// Bildirim listener'ları
export function addNotificationReceivedListener(callback: (notification: any) => void) {
  if (isExpoGo || !Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseReceivedListener(callback: (response: any) => void) {
  if (isExpoGo || !Notifications) {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(callback);
}

// Badge sayısını güncelle
export async function setBadgeCount(count: number): Promise<void> {
  if (isExpoGo) return;
  
  try {
    const loaded = await loadNotificationsModule();
    if (!loaded || !Notifications) return;
    await Notifications.setBadgeCountAsync(count);
  } catch (error) {
    // Sessizce devam et
  }
}

// Tüm bildirimleri temizle
export async function clearAllNotifications(): Promise<void> {
  if (isExpoGo) return;
  
  try {
    const loaded = await loadNotificationsModule();
    if (!loaded || !Notifications) return;
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  } catch (error) {
    // Sessizce devam et
  }
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
