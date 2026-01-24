import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

// Event types
export type AnalyticsEventType = 
  | 'app_open'
  | 'app_close'
  | 'screen_view'
  | 'user_login'
  | 'user_logout'
  | 'user_signup'
  | 'post_create'
  | 'post_like'
  | 'post_comment'
  | 'message_send'
  | 'community_join'
  | 'community_leave'
  | 'group_join'
  | 'group_leave'
  | 'service_create'
  | 'service_view'
  | 'profile_view'
  | 'profile_edit'
  | 'search'
  | 'notification_open'
  | 'share'
  | 'error';

interface AnalyticsEvent {
  event: AnalyticsEventType;
  properties?: Record<string, any>;
  timestamp: string;
  sessionId: string;
}

interface UserProperties {
  userId?: string;
  city?: string;
  occupation?: string;
  memberSince?: string;
  isAdmin?: boolean;
}

class AnalyticsService {
  private sessionId: string;
  private userId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private sessionStart: Date;
  private screenViewHistory: string[] = [];

  constructor() {
    this.sessionId = this.generateSessionId();
    this.sessionStart = new Date();
    this.startFlushInterval();
    this.loadQueuedEvents();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Kullanıcı kimliğini ayarla
  setUserId(userId: string | null) {
    this.userId = userId;
    if (userId) {
      this.track('user_login', { userId });
    }
  }

  // Kullanıcı özelliklerini ayarla
  async setUserProperties(properties: UserProperties) {
    try {
      await AsyncStorage.setItem('analytics_user_props', JSON.stringify(properties));
      // Backend'e de gönder
      if (this.userId) {
        await api.post('/api/analytics/user-properties', {
          userId: this.userId,
          properties,
        }).catch(() => {}); // Sessizce başarısız olabilir
      }
    } catch (error) {
      console.error('Analytics: Failed to set user properties', error);
    }
  }

  // Event takibi
  track(event: AnalyticsEventType, properties?: Record<string, any>) {
    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        userId: this.userId,
      },
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
    };

    this.eventQueue.push(analyticsEvent);
    
    // Debug için log
    if (__DEV__) {
      console.log('📊 Analytics:', event, properties);
    }

    // Queue 10'u geçerse flush et
    if (this.eventQueue.length >= 10) {
      this.flush();
    }
  }

  // Ekran görüntüleme takibi
  trackScreen(screenName: string, properties?: Record<string, any>) {
    this.screenViewHistory.push(screenName);
    if (this.screenViewHistory.length > 10) {
      this.screenViewHistory.shift();
    }
    
    this.track('screen_view', {
      screen_name: screenName,
      previous_screen: this.screenViewHistory[this.screenViewHistory.length - 2] || null,
      ...properties,
    });
  }

  // Hata takibi
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error', {
      error_message: error.message,
      error_stack: error.stack?.substring(0, 500),
      ...context,
    });
  }

  // Backend'e gönder
  private async flush() {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      await api.post('/api/analytics/events', {
        events: eventsToSend,
        sessionId: this.sessionId,
        sessionDuration: Date.now() - this.sessionStart.getTime(),
      }).catch(() => {
        // Backend başarısız olursa local'e kaydet
        this.saveQueuedEvents(eventsToSend);
      });
    } catch (error) {
      // Başarısız olursa queue'ya geri ekle
      this.saveQueuedEvents(eventsToSend);
    }
  }

  // Local'e kaydet (offline support)
  private async saveQueuedEvents(events: AnalyticsEvent[]) {
    try {
      const existing = await AsyncStorage.getItem('analytics_queue');
      const existingEvents = existing ? JSON.parse(existing) : [];
      const allEvents = [...existingEvents, ...events].slice(-100); // Max 100 event tut
      await AsyncStorage.setItem('analytics_queue', JSON.stringify(allEvents));
    } catch (error) {
      console.error('Analytics: Failed to save queued events', error);
    }
  }

  // Local'den yükle
  private async loadQueuedEvents() {
    try {
      const stored = await AsyncStorage.getItem('analytics_queue');
      if (stored) {
        const events = JSON.parse(stored);
        this.eventQueue = [...events, ...this.eventQueue];
        await AsyncStorage.removeItem('analytics_queue');
        this.flush();
      }
    } catch (error) {
      console.error('Analytics: Failed to load queued events', error);
    }
  }

  // Periyodik flush
  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // 30 saniyede bir
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush();
  }

  // Session bilgisi
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.sessionStart.getTime(),
      screenViewCount: this.screenViewHistory.length,
      lastScreen: this.screenViewHistory[this.screenViewHistory.length - 1],
    };
  }
}

// Singleton instance
const analytics = new AnalyticsService();

// Helper functions
export const trackEvent = (event: AnalyticsEventType, properties?: Record<string, any>) => {
  analytics.track(event, properties);
};

export const trackScreen = (screenName: string, properties?: Record<string, any>) => {
  analytics.trackScreen(screenName, properties);
};

export const trackError = (error: Error, context?: Record<string, any>) => {
  analytics.trackError(error, context);
};

export const setAnalyticsUserId = (userId: string | null) => {
  analytics.setUserId(userId);
};

export const setAnalyticsUserProperties = (properties: UserProperties) => {
  analytics.setUserProperties(properties);
};

export default analytics;
