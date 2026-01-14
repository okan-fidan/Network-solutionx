/**
 * Sohbet Ayarları Context
 * Gizlilik ayarları, sessize alma, arşivleme vb.
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';

type LastSeenOption = 'everyone' | 'contacts' | 'nobody';
type ReadReceiptsOption = 'everyone' | 'contacts' | 'nobody';

interface PrivacySettings {
  lastSeen: LastSeenOption;
  readReceipts: boolean;
  showOnlineStatus: boolean;
}

interface ChatSettings {
  mutedChats: string[];  // chatId array
  archivedChats: string[];  // chatId array
  pinnedMessages: { [chatId: string]: string[] };  // chatId -> messageId array
}

interface ChatSettingsContextType {
  privacySettings: PrivacySettings;
  chatSettings: ChatSettings;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  muteChat: (chatId: string, mute: boolean) => Promise<void>;
  archiveChat: (chatId: string, archive: boolean) => Promise<void>;
  pinMessage: (chatId: string, messageId: string, pin: boolean) => Promise<void>;
  isChatMuted: (chatId: string) => boolean;
  isChatArchived: (chatId: string) => boolean;
  isMessagePinned: (chatId: string, messageId: string) => boolean;
  getPinnedMessages: (chatId: string) => string[];
}

const defaultPrivacySettings: PrivacySettings = {
  lastSeen: 'everyone',
  readReceipts: true,
  showOnlineStatus: true,
};

const defaultChatSettings: ChatSettings = {
  mutedChats: [],
  archivedChats: [],
  pinnedMessages: {},
};

const ChatSettingsContext = createContext<ChatSettingsContextType | undefined>(undefined);

export function ChatSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(defaultPrivacySettings);
  const [chatSettings, setChatSettings] = useState<ChatSettings>(defaultChatSettings);

  useEffect(() => {
    if (user?.uid) {
      loadSettings();
    }
  }, [user?.uid]);

  const loadSettings = async () => {
    try {
      // Local storage'dan yükle
      const savedPrivacy = await AsyncStorage.getItem('privacy_settings');
      const savedChat = await AsyncStorage.getItem('chat_settings');
      
      if (savedPrivacy) {
        setPrivacySettings({ ...defaultPrivacySettings, ...JSON.parse(savedPrivacy) });
      }
      if (savedChat) {
        setChatSettings({ ...defaultChatSettings, ...JSON.parse(savedChat) });
      }

      // Firebase'den de sync et
      if (user?.uid) {
        const userDoc = await getDoc(doc(db, 'userSettings', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.privacySettings) {
            setPrivacySettings(prev => ({ ...prev, ...data.privacySettings }));
          }
          if (data.chatSettings) {
            setChatSettings(prev => ({ ...prev, ...data.chatSettings }));
          }
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveToStorage = async (privacy: PrivacySettings, chat: ChatSettings) => {
    try {
      await AsyncStorage.setItem('privacy_settings', JSON.stringify(privacy));
      await AsyncStorage.setItem('chat_settings', JSON.stringify(chat));
      
      // Firebase'e de kaydet
      if (user?.uid) {
        const userSettingsRef = doc(db, 'userSettings', user.uid);
        await updateDoc(userSettingsRef, {
          privacySettings: privacy,
          chatSettings: chat,
          updatedAt: new Date(),
        }).catch(async () => {
          // Döküman yoksa oluştur
          const { setDoc } = await import('firebase/firestore');
          await setDoc(userSettingsRef, {
            privacySettings: privacy,
            chatSettings: chat,
            updatedAt: new Date(),
          });
        });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    const newSettings = { ...privacySettings, ...settings };
    setPrivacySettings(newSettings);
    await saveToStorage(newSettings, chatSettings);
  };

  const muteChat = async (chatId: string, mute: boolean) => {
    const newMuted = mute
      ? [...chatSettings.mutedChats, chatId]
      : chatSettings.mutedChats.filter(id => id !== chatId);
    const newSettings = { ...chatSettings, mutedChats: newMuted };
    setChatSettings(newSettings);
    await saveToStorage(privacySettings, newSettings);
  };

  const archiveChat = async (chatId: string, archive: boolean) => {
    const newArchived = archive
      ? [...chatSettings.archivedChats, chatId]
      : chatSettings.archivedChats.filter(id => id !== chatId);
    const newSettings = { ...chatSettings, archivedChats: newArchived };
    setChatSettings(newSettings);
    await saveToStorage(privacySettings, newSettings);
  };

  const pinMessage = async (chatId: string, messageId: string, pin: boolean) => {
    const currentPinned = chatSettings.pinnedMessages[chatId] || [];
    const newPinned = pin
      ? [...currentPinned, messageId]
      : currentPinned.filter(id => id !== messageId);
    const newSettings = {
      ...chatSettings,
      pinnedMessages: { ...chatSettings.pinnedMessages, [chatId]: newPinned },
    };
    setChatSettings(newSettings);
    await saveToStorage(privacySettings, newSettings);
  };

  const isChatMuted = (chatId: string) => chatSettings.mutedChats.includes(chatId);
  const isChatArchived = (chatId: string) => chatSettings.archivedChats.includes(chatId);
  const isMessagePinned = (chatId: string, messageId: string) => 
    (chatSettings.pinnedMessages[chatId] || []).includes(messageId);
  const getPinnedMessages = (chatId: string) => chatSettings.pinnedMessages[chatId] || [];

  return (
    <ChatSettingsContext.Provider
      value={{
        privacySettings,
        chatSettings,
        updatePrivacySettings,
        muteChat,
        archiveChat,
        pinMessage,
        isChatMuted,
        isChatArchived,
        isMessagePinned,
        getPinnedMessages,
      }}
    >
      {children}
    </ChatSettingsContext.Provider>
  );
}

export function useChatSettings() {
  const context = useContext(ChatSettingsContext);
  if (context === undefined) {
    throw new Error('useChatSettings must be used within a ChatSettingsProvider');
  }
  return context;
}
