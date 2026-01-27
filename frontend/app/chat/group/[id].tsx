import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import SimpleVideoPlayer from '../../../src/components/SimpleVideoPlayer';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../../src/config/firebase';
import { subgroupApi, chatStatusApi } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { tr } from 'date-fns/locale';
import api from '../../../src/services/api';

// Tepki emoji listesi
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];
const EMOJI_LIST = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂',
  '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛',
  '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '🔥', '✨', '🎉', '🎊', '💯', '👏', '🙌', '👋', '🤝', '💪',
];

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderProfileImage?: string;
  senderOccupation?: string;
  content: string;
  timestamp: string;
  type?: 'text' | 'image' | 'video' | 'file' | 'location' | 'poll' | 'deleted';
  mediaUrl?: string;
  fileName?: string;
  edited?: boolean;
  isDeleted?: boolean;
  isPinned?: boolean;
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
  };
  status?: 'sent' | 'delivered' | 'read';
  readBy?: string[];
  deliveredTo?: string[];
  reactions?: { emoji: string; userId: string; userName: string }[];
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    isLive?: boolean;
  };
  poll?: Poll;
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isMultipleChoice: boolean;
  isAnonymous: boolean;
}

interface SubGroup {
  id: string;
  name: string;
  memberCount: number;
  communityName?: string;
  groupAdmins?: string[];
  members?: string[];
  imageUrl?: string;
}

export default function GroupChatScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [subgroup, setSubgroup] = useState<SubGroup | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  // Grup ayarları için state'ler
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [uploadingGroupImage, setUploadingGroupImage] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  // Yanıtlama (Reply) için state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  // İletme (Forward) için state
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardTargets, setForwardTargets] = useState<{id: string, name: string, type: 'group' | 'user'}[]>([]);
  const [loadingForwardTargets, setLoadingForwardTargets] = useState(false);
  // @mention için state'ler
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [groupMembers, setGroupMembers] = useState<{uid: string; firstName: string; lastName: string}[]>([]);
  // Anketler
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  // Akıllı yanıtlar
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [loadingSmartReplies, setLoadingSmartReplies] = useState(false);
  // Eski mesajları yükleme (Telegram benzeri)
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [messageSkip, setMessageSkip] = useState(0);
  // Tepki (Reaction) için state'ler
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<Message | null>(null);
  // Konum paylaşma için state'ler
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  // Yazıyor göstergesi için state'ler
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [lastTypingTime, setLastTypingTime] = useState<number>(0);
  const typingSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const isGroupAdmin = subgroup?.groupAdmins?.includes(user?.uid || '') || false;

  // Grup profil resmi değiştir
  const handleChangeGroupImage = async () => {
    if (!isGroupAdmin) {
      Alert.alert('Yetki Gerekli', 'Sadece grup yöneticileri profil resmini değiştirebilir.');
      return;
    }
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploadingGroupImage(true);
      try {
        await api.put(`/api/subgroups/${groupId}/image`, {
          imageData: result.assets[0].base64,
        });
        Alert.alert('Başarılı', 'Grup fotoğrafı güncellendi');
        setShowGroupSettings(false);
        loadData();
      } catch (error) {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi');
      } finally {
        setUploadingGroupImage(false);
      }
    }
  };

  // Filtrelenmiş üye listesi (@mention için)
  const filteredMembers = groupMembers.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(mentionSearch.toLowerCase());
  });

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [messagesRes, groupRes] = await Promise.all([
        subgroupApi.getMessages(groupId),
        subgroupApi.getOne(groupId),
      ]);
      setMessages(messagesRes.data.reverse());
      setSubgroup(groupRes.data);
      
      // Üyeleri yükle (@mention için)
      try {
        const membersRes = await subgroupApi.getMembers(groupId);
        setGroupMembers(membersRes.data || []);
      } catch (e) {
        // Üye yükleme hatası sessizce geç
      }
      
      // Mesajları okundu olarak işaretle
      markMessagesAsRead();
    } catch (error) {
      console.error('Error loading group chat:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Mesajları okundu olarak işaretle
  const markMessagesAsRead = async () => {
    if (!groupId || !user?.uid) return;
    try {
      // Yeni markAsRead API'sini kullan
      await subgroupApi.markAsRead(groupId);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Cleanup typing indicator on unmount
  useEffect(() => {
    return () => {
      if (typingSendTimeoutRef.current) {
        clearTimeout(typingSendTimeoutRef.current);
      }
    };
  }, []);

  // Yazıyor göstergesi gönder
  const sendTypingIndicator = useCallback(async () => {
    if (!groupId) return;
    
    const now = Date.now();
    // Her 2 saniyede bir gönder
    if (now - lastTypingTime < 2000) return;
    
    setLastTypingTime(now);
    
    try {
      await chatStatusApi.sendTyping(groupId, true);
    } catch (error) {
      // Sessizce devam et
    }
  }, [groupId, lastTypingTime]);

  // Input değiştiğinde yazıyor göstergesini gönder
  const handleInputChange = (text: string) => {
    setInputText(text);
    
    if (text.trim()) {
      sendTypingIndicator();
      
      // 3 saniye sonra yazıyor göstergesini durdur
      if (typingSendTimeoutRef.current) {
        clearTimeout(typingSendTimeoutRef.current);
      }
      typingSendTimeoutRef.current = setTimeout(async () => {
        if (groupId) {
          try {
            await chatStatusApi.sendTyping(groupId, false);
          } catch (error) {
            // Sessizce devam et
          }
        }
      }, 3000);
    }
  };

  // Son mesaj değiştiğinde akıllı yanıtları yükle
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.senderId !== user?.uid && lastMessage.type === 'text') {
      loadSmartReplies(lastMessage.content);
    } else {
      setSmartReplies([]);
    }
  }, [messages]);

  // Akıllı yanıtları yükle
  const loadSmartReplies = async (messageContent: string) => {
    if (!messageContent || messageContent.length < 3) {
      setSmartReplies([]);
      return;
    }
    
    setLoadingSmartReplies(true);
    try {
      const response = await api.post('/api/ai/smart-replies', {
        messageContent,
        conversationType: 'group',
      });
      setSmartReplies(response.data.replies || []);
    } catch (error) {
      console.error('Error loading smart replies:', error);
      setSmartReplies([]);
    } finally {
      setLoadingSmartReplies(false);
    }
  };

  // Akıllı yanıtı seç ve gönder
  const handleSelectSmartReply = (reply: string) => {
    setInputText(reply);
    setSmartReplies([]);
  };

  // İletme hedeflerini yükle
  const loadForwardTargets = async () => {
    setLoadingForwardTargets(true);
    try {
      const [chatsRes, usersRes] = await Promise.all([
        api.get('/api/chats'),
        api.get('/api/users'),
      ]);
      
      const targets: {id: string, name: string, type: 'group' | 'user'}[] = [];
      
      // Sohbetleri ekle
      chatsRes.data?.forEach((chat: any) => {
        targets.push({
          id: chat.chatId,
          name: chat.userName,
          type: 'user'
        });
      });
      
      // Kullanıcıları ekle (henüz sohbet başlatılmamış olanlar)
      usersRes.data?.slice(0, 20).forEach((u: any) => {
        if (!targets.find(t => t.id.includes(u.uid))) {
          targets.push({
            id: u.uid,
            name: `${u.firstName} ${u.lastName}`,
            type: 'user'
          });
        }
      });
      
      setForwardTargets(targets);
    } catch (error) {
      console.error('Error loading forward targets:', error);
    } finally {
      setLoadingForwardTargets(false);
    }
  };

  const uploadMedia = async (uri: string, type: 'image' | 'video' | 'file', fileName?: string) => {
    if (!user?.uid || !groupId) return null;
    
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const ext = type === 'file' ? (fileName?.split('.').pop() || 'file') : (type === 'video' ? 'mp4' : 'jpg');
      const path = `group_media/${groupId}/${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  };

  const handleSend = async (mediaUrl?: string, mediaType?: 'image' | 'video' | 'file', fileName?: string) => {
    // Düzenleme modu
    if (editingMessage) {
      await handleEditMessage();
      return;
    }
    
    if ((!inputText.trim() && !mediaUrl) || !groupId) return;

    // Yazıyor göstergesini durdur
    try {
      await chatStatusApi.sendTyping(groupId, false);
    } catch (error) {
      // Sessizce devam et
    }

    setSending(true);
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    
    const messageText = inputText.trim();
    setInputText('');

    try {
      const messageData: any = {
        content: messageText,
        type: mediaType || 'text',
      };
      
      if (mediaUrl) {
        messageData.mediaUrl = mediaUrl;
        if (fileName) messageData.fileName = fileName;
      }

      // Yanıtlanan mesaj varsa ekle
      if (replyingTo) {
        messageData.replyTo = {
          id: replyingTo.id,
          content: replyingTo.content.substring(0, 100),
          senderName: replyingTo.senderName,
        };
      }

      const response = await subgroupApi.sendMessage(groupId, messageData);
      setMessages([...messages, response.data]);
      setReplyingTo(null);
      setTimeout(() => flatListRef.current?.scrollToEnd(), 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string, deleteForAll: boolean = false) => {
    if (!groupId) return;
    
    try {
      await subgroupApi.deleteMessage(groupId, messageId, deleteForAll);
      if (deleteForAll) {
        // Herkesten silindi - içeriği güncelle
        setMessages(messages.map(m => 
          m.id === messageId 
            ? { ...m, content: 'Bu mesaj silindi', type: 'deleted' as const, isDeleted: true }
            : m
        ));
      } else {
        // Sadece benden silindi - listeden kaldır
        setMessages(messages.filter(m => m.id !== messageId));
      }
    } catch (error: any) {
      console.error('Error deleting message:', error);
      Alert.alert('Hata', error?.response?.data?.detail || 'Mesaj silinemedi');
    }
    setShowMessageActions(false);
  };

  const showDeleteOptions = (message: Message) => {
    const isMe = message.senderId === user?.uid;
    const isAdmin = userProfile?.isAdmin || isGroupAdmin;
    
    if (isMe || isAdmin) {
      // Kendi mesajım veya admin - iki seçenek göster
      Alert.alert(
        'Mesajı Sil',
        'Bu mesajı nasıl silmek istiyorsunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Benden Sil',
            onPress: () => handleDeleteMessage(message.id, false),
          },
          {
            text: 'Herkesten Sil',
            style: 'destructive',
            onPress: () => handleDeleteMessage(message.id, true),
          },
        ]
      );
    } else {
      // Normal kullanıcı başkasının mesajı - sadece benden sil
      Alert.alert(
        'Mesajı Sil',
        'Bu mesaj sizin için silinecek.',
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Sil',
            style: 'destructive',
            onPress: () => handleDeleteMessage(message.id, false),
          },
        ]
      );
    }
    setShowMessageActions(false);
  };

  const handleEditMessage = async () => {
    if (!editingMessage || !inputText.trim() || !groupId) return;
    
    try {
      await subgroupApi.editMessage(groupId, editingMessage.id, { content: inputText.trim() });
      setMessages(messages.map(m => 
        m.id === editingMessage.id 
          ? { ...m, content: inputText.trim(), edited: true }
          : m
      ));
      setEditingMessage(null);
      setInputText('');
    } catch (error: any) {
      console.error('Error editing message:', error?.response?.data || error);
      Alert.alert('Hata', error?.response?.data?.detail || 'Mesaj düzenlenemedi');
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessage(message);
    setInputText(message.content);
    setShowMessageActions(false);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const handlePinMessage = async (message: Message) => {
    if (!groupId) return;
    
    try {
      await subgroupApi.pinMessage(groupId, message.id);
      Alert.alert('Başarılı', 'Mesaj sabitlendi');
      setMessages(messages.map(m => 
        m.id === message.id ? { ...m, isPinned: true } : m
      ));
    } catch (error: any) {
      console.error('Error pinning message:', error);
      Alert.alert('Hata', error?.response?.data?.detail || 'Mesaj sabitlenemedi');
    }
    setShowMessageActions(false);
  };

  // Yanıtlama başlat
  const startReply = (message: Message) => {
    setReplyingTo(message);
    setShowMessageActions(false);
  };

  // Yanıtlamayı iptal et
  const cancelReply = () => {
    setReplyingTo(null);
  };

  // İletme başlat
  const startForward = (message: Message) => {
    setForwardingMessage(message);
    setShowMessageActions(false);
    setShowForwardModal(true);
    loadForwardTargets();
  };

  // Mesaj ilet
  const handleForward = async (targetId: string, targetType: 'group' | 'user') => {
    if (!forwardingMessage) return;
    
    try {
      if (targetType === 'user') {
        // Özel mesaj olarak ilet
        await api.post('/api/private-messages', {
          receiverId: targetId,
          content: `📨 İletilen mesaj:\n\n${forwardingMessage.content}`,
          type: forwardingMessage.type || 'text',
          mediaUrl: forwardingMessage.mediaUrl,
        });
      } else {
        // Grup mesajı olarak ilet
        await subgroupApi.sendMessage(targetId, {
          content: `📨 İletilen mesaj:\n\n${forwardingMessage.content}`,
          type: forwardingMessage.type || 'text',
          mediaUrl: forwardingMessage.mediaUrl,
        });
      }
      
      Alert.alert('Başarılı', 'Mesaj iletildi');
      setShowForwardModal(false);
      setForwardingMessage(null);
    } catch (error) {
      console.error('Error forwarding message:', error);
      Alert.alert('Hata', 'Mesaj iletilemedi');
    }
  };

  // @mention için text değişikliği
  const handleTextChange = (text: string) => {
    setInputText(text);
    
    // Yazıyor göstergesini gönder
    if (text.trim()) {
      sendTypingIndicator();
      
      // 3 saniye sonra yazıyor göstergesini durdur
      if (typingSendTimeoutRef.current) {
        clearTimeout(typingSendTimeoutRef.current);
      }
      typingSendTimeoutRef.current = setTimeout(async () => {
        if (groupId) {
          try {
            await chatStatusApi.sendTyping(groupId, false);
          } catch (error) {
            // Sessizce devam et
          }
        }
      }, 3000);
    }
    
    const lastAtIndex = text.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = text.slice(lastAtIndex + 1);
      if (!afterAt.includes(' ')) {
        setMentionSearch(afterAt);
        setShowMentionList(true);
        return;
      }
    }
    setShowMentionList(false);
    setMentionSearch('');
  };

  // Üye seçildiğinde mention ekle
  const handleSelectMention = (member: {uid: string; firstName: string; lastName: string}) => {
    const lastAtIndex = inputText.lastIndexOf('@');
    const beforeAt = inputText.slice(0, lastAtIndex);
    const newText = `${beforeAt}@${member.firstName} ${member.lastName} `;
    setInputText(newText);
    setShowMentionList(false);
    setMentionSearch('');
  };

  const handleLongPressMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageActions(true);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      const url = await uploadMedia(result.assets[0].uri, 'image');
      setUploading(false);
      if (url) await handleSend(url, 'image');
      else Alert.alert('Hata', 'Fotoğraf yüklenemedi');
    }
    setShowAttachMenu(false);
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Video seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.5,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      const url = await uploadMedia(result.assets[0].uri, 'video');
      setUploading(false);
      if (url) await handleSend(url, 'video');
      else Alert.alert('Hata', 'Video yüklenemedi');
    }
    setShowAttachMenu(false);
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setUploading(true);
        const url = await uploadMedia(file.uri, 'file', file.name);
        setUploading(false);
        if (url) await handleSend(url, 'file', file.name);
        else Alert.alert('Hata', 'Dosya yüklenemedi');
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
    setShowAttachMenu(false);
  };

  // Tepki ekle/kaldır
  const handleReaction = async (message: Message, emoji: string) => {
    if (!groupId || !user?.uid) return;
    
    try {
      const result = await subgroupApi.reactToMessage(groupId, message.id, emoji);
      
      // Backend'den dönen reactions ile güncelle
      const newReactions = result.data?.reactions || {};
      
      setMessages(messages.map(m => {
        if (m.id !== message.id) return m;
        
        // reactions formatını dönüştür
        const formattedReactions: { emoji: string; userId: string; userName: string }[] = [];
        for (const [emj, userIds] of Object.entries(newReactions)) {
          if (Array.isArray(userIds)) {
            userIds.forEach((uid: string) => {
              formattedReactions.push({
                emoji: emj,
                userId: uid,
                userName: uid === user.uid ? (userProfile?.firstName || 'Sen') : 'Kullanıcı',
              });
            });
          }
        }
        
        return { ...m, reactions: formattedReactions };
      }));
    } catch (error: any) {
      console.error('Error adding reaction:', error?.response?.data || error);
      Alert.alert('Hata', 'Reaksiyon eklenemedi');
    }
    
    setShowReactionPicker(false);
    setReactionTargetMessage(null);
  };

  // Konum paylaş
  const shareLocation = async (isLive: boolean = false, duration?: number) => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum paylaşmak için konum izni gerekiyor.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Adres al
      let address = '';
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (addressResult) {
          address = [addressResult.street, addressResult.district, addressResult.city]
            .filter(Boolean)
            .join(', ');
        }
      } catch (e) {}

      // Konum mesajı gönder
      await subgroupApi.sendMessage(groupId!, {
        content: `📍 ${address || 'Konum'}`,
        type: 'location',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address,
          isLive,
          duration,
        },
      });

      loadData();
      Alert.alert('Başarılı', 'Konum paylaşıldı');
    } catch (error) {
      console.error('Error sharing location:', error);
      Alert.alert('Hata', 'Konum paylaşılamadı');
    } finally {
      setLoadingLocation(false);
      setShowLocationPicker(false);
      setShowAttachMenu(false);
    }
  };

  // Konum mesajını haritada aç
  const openLocationInMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:${lat},${lng}?q=Konum`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(Konum)`,
      default: `https://maps.google.com/?q=${lat},${lng}`,
    });
    Linking.openURL(url as string).catch(() => {
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
    });
  };

  // Anket oluştur
  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || !groupId) return;
    
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      Alert.alert('Hata', 'En az 2 seçenek gerekli');
      return;
    }

    try {
      await subgroupApi.createPoll(groupId, {
        question: pollQuestion.trim(),
        options: validOptions.map(o => o.trim()),
      });
      
      // Reset form
      setPollQuestion('');
      setPollOptions(['', '']);
      setShowPollModal(false);
      setShowAttachMenu(false);
      
      loadData();
      Alert.alert('Başarılı', 'Anket oluşturuldu');
    } catch (error: any) {
      console.error('Error creating poll:', error);
      Alert.alert('Hata', error?.response?.data?.detail || 'Anket oluşturulamadı');
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      // Gerçek saat göster (HH:mm formatında)
      return format(date, 'HH:mm');
    } catch {
      return '';
    }
  };

  // Mesaj içeriğini @mention highlight'lı şekilde render et
  const renderMessageContent = (content: string, isMe: boolean) => {
    const mentionRegex = /@([A-Za-zÇçĞğİıÖöŞşÜü]+\s[A-Za-zÇçĞğİıÖöŞşÜü]+)/g;
    const parts = content.split(mentionRegex);
    
    if (parts.length === 1) {
      return <Text style={[styles.messageText, isMe && styles.myMessageText]}>{content}</Text>;
    }

    const elements: React.ReactNode[] = [];
    let match;
    let lastIndex = 0;
    const regex = new RegExp(mentionRegex);
    
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        elements.push(
          <Text key={`text-${lastIndex}`} style={[styles.messageText, isMe && styles.myMessageText]}>
            {content.slice(lastIndex, match.index)}
          </Text>
        );
      }
      elements.push(
        <Text key={`mention-${match.index}`} style={[styles.mentionHighlight, isMe && styles.myMentionHighlight]}>
          {match[0]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      elements.push(
        <Text key={`text-end`} style={[styles.messageText, isMe && styles.myMessageText]}>
          {content.slice(lastIndex)}
        </Text>
      );
    }

    return <Text style={[styles.messageText, isMe && styles.myMessageText]}>{elements}</Text>;
  };

  // Mesaj durumu ikonu
  const renderMessageStatus = (message: Message, isMe: boolean) => {
    if (!isMe) return null;
    
    const memberCount = subgroup?.members?.length || 0;
    const readCount = message.readBy?.length || 1;
    const deliveredCount = message.deliveredTo?.length || 0;
    
    // Herkes okudu - Telegram açık mavi
    if (readCount >= memberCount - 1 && memberCount > 1) {
      return (
        <View style={styles.readReceipt}>
          <Ionicons name="checkmark-done" size={16} color="#5eb5f7" />
        </View>
      );
    }
    // İletildi - çift tik gri
    if (deliveredCount > 0) {
      return (
        <View style={styles.readReceipt}>
          <Ionicons name="checkmark-done" size={16} color="#6e8aa5" />
        </View>
      );
    }
    // Gönderildi - tek tik gri
    return (
      <View style={styles.readReceipt}>
        <Ionicons name="checkmark" size={16} color="#6e8aa5" />
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.uid;

    return (
      <TouchableOpacity 
        style={[styles.messageContainer, isMe && styles.myMessageContainer]}
        onLongPress={() => handleLongPressMessage(item)}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        {!isMe && (
          <TouchableOpacity 
            style={styles.avatarSmall}
            onPress={() => router.push(`/user/${item.senderId}`)}
          >
            {item.senderProfileImage ? (
              <Image source={{ uri: item.senderProfileImage }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={16} color="#9ca3af" />
            )}
          </TouchableOpacity>
        )}
        <View style={[styles.messageBubble, isMe ? styles.myBubble : styles.otherBubble]}>
          {item.isPinned && (
            <View style={styles.pinnedBadge}>
              <Ionicons name="pin" size={12} color="#f59e0b" />
              <Text style={styles.pinnedText}>Sabitlendi</Text>
            </View>
          )}
          {!isMe && (
            <View style={styles.senderInfo}>
              <Text style={styles.senderName}>{item.senderName}</Text>
              {item.senderOccupation && (
                <View style={styles.occupationBadge}>
                  <Text style={styles.occupationText}>{item.senderOccupation}</Text>
                </View>
              )}
            </View>
          )}
          
          {/* Yanıtlanan mesaj */}
          {item.replyTo && (
            <View style={[styles.replyPreview, isMe && styles.myReplyPreview]}>
              <View style={styles.replyBar} />
              <View style={styles.replyContent}>
                <Text style={styles.replyName}>{item.replyTo.senderName}</Text>
                <Text style={styles.replyText} numberOfLines={2}>{item.replyTo.content}</Text>
              </View>
            </View>
          )}
          
          {item.type === 'image' && item.mediaUrl && (
            <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} resizeMode="cover" />
          )}
          
          {item.type === 'video' && item.mediaUrl && (
            <View style={styles.videoContainer}>
              <SimpleVideoPlayer uri={item.mediaUrl} style={styles.messageVideo} />
            </View>
          )}
          
          {item.type === 'file' && item.mediaUrl && (
            <TouchableOpacity style={styles.fileAttachment}>
              <Ionicons name="document" size={24} color="#6366f1" />
              <Text style={styles.fileName} numberOfLines={1}>{item.fileName || 'Dosya'}</Text>
            </TouchableOpacity>
          )}

          {/* Konum mesajı */}
          {item.type === 'location' && item.location && (
            <TouchableOpacity 
              style={styles.locationMessage}
              onPress={() => openLocationInMaps(item.location!.latitude, item.location!.longitude)}
            >
              <View style={styles.locationIcon}>
                <Ionicons 
                  name={item.location.isLive ? 'navigate' : 'location'} 
                  size={24} 
                  color={item.location.isLive ? '#10b981' : '#6366f1'} 
                />
                {item.location.isLive && (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveText}>CANLI</Text>
                  </View>
                )}
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>
                  {item.location.isLive ? 'Canlı Konum' : 'Konum'}
                </Text>
                {item.location.address && (
                  <Text style={styles.locationAddress} numberOfLines={2}>
                    {item.location.address}
                  </Text>
                )}
                <Text style={styles.locationCoords}>
                  {item.location.latitude.toFixed(5)}, {item.location.longitude.toFixed(5)}
                </Text>
              </View>
              <Ionicons name="open-outline" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
          
          {item.content && item.type !== 'location' ? (
            renderMessageContent(item.content, isMe)
          ) : null}

          {/* Tepkiler (Reactions) */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsContainer}>
              {Object.entries(
                item.reactions.reduce((acc: {[key: string]: number}, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                  return acc;
                }, {})
              ).map(([emoji, count]) => (
                <TouchableOpacity 
                  key={emoji} 
                  style={styles.reactionBubble}
                  onPress={() => handleReaction(item, emoji)}
                >
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {(count as number) > 1 && (
                    <Text style={styles.reactionCount}>{count}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isMe && styles.myMessageTime]}>
              {formatTime(item.timestamp)}
            </Text>
            {item.edited && (
              <Text style={[styles.editedLabel, isMe && styles.myEditedLabel]}> (düzenlendi)</Text>
            )}
            {renderMessageStatus(item, isMe)}
          </View>
        </View>
      </TouchableOpacity>
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Message Actions Modal */}
      <Modal
        visible={showMessageActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMessageActions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1}
          onPress={() => setShowMessageActions(false)}
        >
          <View style={styles.actionsModal}>
            <Text style={styles.actionsTitle}>Mesaj İşlemleri</Text>
            
            {/* Hızlı Tepkiler */}
            <View style={styles.quickReactionsRow}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.quickReactionButton}
                  onPress={() => selectedMessage && handleReaction(selectedMessage, emoji)}
                >
                  <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Yanıtla */}
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => selectedMessage && startReply(selectedMessage)}
            >
              <Ionicons name="arrow-undo" size={22} color="#10b981" />
              <Text style={styles.actionText}>Yanıtla</Text>
            </TouchableOpacity>
            
            {/* İlet */}
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => selectedMessage && startForward(selectedMessage)}
            >
              <Ionicons name="arrow-redo" size={22} color="#8b5cf6" />
              <Text style={styles.actionText}>İlet</Text>
            </TouchableOpacity>
            
            {/* Düzenle (sadece kendi mesajları ve text tipinde) */}
            {selectedMessage?.senderId === user?.uid && selectedMessage?.type === 'text' && (
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => selectedMessage && startEditMessage(selectedMessage)}
              >
                <Ionicons name="pencil" size={22} color="#6366f1" />
                <Text style={styles.actionText}>Düzenle</Text>
              </TouchableOpacity>
            )}
            
            {/* Sabitle (sadece admin) */}
            {isGroupAdmin && (
              <TouchableOpacity 
                style={styles.actionItem}
                onPress={() => selectedMessage && handlePinMessage(selectedMessage)}
              >
                <Ionicons name="pin" size={22} color="#f59e0b" />
                <Text style={styles.actionText}>{selectedMessage?.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}</Text>
              </TouchableOpacity>
            )}
            
            {/* Sil (kendi mesajları, grup admini veya global admin) */}
            {(selectedMessage?.senderId === user?.uid || isGroupAdmin || userProfile?.isAdmin) && (
              <TouchableOpacity 
                style={[styles.actionItem, styles.deleteAction]}
                onPress={() => selectedMessage && showDeleteOptions(selectedMessage)}
              >
                <Ionicons name="trash" size={22} color="#ef4444" />
                <Text style={[styles.actionText, styles.deleteText]}>Sil</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => setShowMessageActions(false)}
            >
              <Ionicons name="close" size={22} color="#6b7280" />
              <Text style={styles.actionText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Forward Modal */}
      <Modal
        visible={showForwardModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowForwardModal(false)}
      >
        <View style={styles.forwardModalOverlay}>
          <View style={styles.forwardModalContent}>
            <View style={styles.forwardModalHeader}>
              <Text style={styles.forwardModalTitle}>Mesajı İlet</Text>
              <TouchableOpacity onPress={() => setShowForwardModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* İletilecek mesaj önizleme */}
            {forwardingMessage && (
              <View style={styles.forwardPreview}>
                <Ionicons name="arrow-redo" size={16} color="#8b5cf6" />
                <Text style={styles.forwardPreviewText} numberOfLines={2}>
                  {forwardingMessage.content}
                </Text>
              </View>
            )}
            
            {loadingForwardTargets ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 20 }} />
            ) : (
              <ScrollView style={styles.forwardTargetList}>
                {forwardTargets.map((target) => (
                  <TouchableOpacity
                    key={target.id}
                    style={styles.forwardTargetItem}
                    onPress={() => handleForward(target.id, target.type)}
                  >
                    <View style={styles.forwardTargetAvatar}>
                      <Ionicons 
                        name={target.type === 'group' ? 'people' : 'person'} 
                        size={20} 
                        color="#6366f1" 
                      />
                    </View>
                    <Text style={styles.forwardTargetName}>{target.name}</Text>
                    <Ionicons name="send" size={18} color="#6b7280" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={isGroupAdmin ? () => setShowGroupSettings(true) : undefined}
          disabled={!isGroupAdmin}
        >
          {subgroup?.imageUrl ? (
            <Image source={{ uri: subgroup.imageUrl }} style={styles.groupImageSmall} />
          ) : (
            <View style={styles.groupIcon}>
              <Ionicons name="chatbubbles" size={20} color="#6366f1" />
            </View>
          )}
          {isGroupAdmin && (
            <View style={styles.editBadgeSmall}>
              <Ionicons name="camera" size={10} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.headerInfo}
          onPress={() => router.push(`/chat/group/menu/${groupId}`)}
        >
          <Text style={styles.headerName}>{subgroup?.name}</Text>
          <Text style={styles.headerSubtitle}>
            {subgroup?.memberCount} üye {subgroup?.communityName && `• ${subgroup.communityName}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => setShowGroupSettings(true)}
        >
          <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Group Settings Modal */}
      <Modal visible={showGroupSettings} animationType="slide" transparent>
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsContent}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Grup Ayarları</Text>
              <TouchableOpacity onPress={() => setShowGroupSettings(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsBody}>
              {/* Grup profil resmi */}
              <TouchableOpacity 
                style={styles.groupProfileSection}
                onPress={isGroupAdmin ? handleChangeGroupImage : undefined}
                disabled={!isGroupAdmin || uploadingGroupImage}
              >
                {subgroup?.imageUrl ? (
                  <Image source={{ uri: subgroup.imageUrl }} style={styles.groupImageLarge} />
                ) : (
                  <View style={styles.groupIconLarge}>
                    <Ionicons name="chatbubbles" size={40} color="#6366f1" />
                  </View>
                )}
                {isGroupAdmin && (
                  <View style={styles.editBadgeLarge}>
                    {uploadingGroupImage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Ionicons name="camera" size={16} color="#fff" />
                    )}
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.groupNameSettings}>{subgroup?.name}</Text>
              <Text style={styles.groupMemberCount}>{subgroup?.memberCount} üye</Text>

              {/* Profil Resmi Değiştir */}
              {isGroupAdmin && (
                <TouchableOpacity 
                  style={styles.settingsOption}
                  onPress={handleChangeGroupImage}
                  disabled={uploadingGroupImage}
                >
                  <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                    <Ionicons name="camera" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.settingsOptionInfo}>
                    <Text style={styles.settingsOptionTitle}>Profil Fotoğrafı Değiştir</Text>
                    <Text style={styles.settingsOptionSubtitle}>Grup resmini güncelle</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}

              {/* Grup Bilgisi */}
              <TouchableOpacity 
                style={styles.settingsOption}
                onPress={() => {
                  setShowGroupSettings(false);
                  router.push(`/chat/group/menu/${groupId}`);
                }}
              >
                <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="information-circle" size={24} color="#10b981" />
                </View>
                <View style={styles.settingsOptionInfo}>
                  <Text style={styles.settingsOptionTitle}>Grup Bilgisi</Text>
                  <Text style={styles.settingsOptionSubtitle}>Üyeleri ve detayları görüntüle</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Moderatör Paneli - Sadece admin görür */}
              {isGroupAdmin && (
                <TouchableOpacity 
                  style={styles.settingsOption}
                  onPress={() => {
                    setShowGroupSettings(false);
                    router.push(`/chat/group/moderator-panel?id=${groupId}`);
                  }}
                >
                  <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <Ionicons name="shield-checkmark" size={24} color="#8b5cf6" />
                  </View>
                  <View style={styles.settingsOptionInfo}>
                    <Text style={styles.settingsOptionTitle}>Yönetim Paneli</Text>
                    <Text style={styles.settingsOptionSubtitle}>Alt yöneticileri ve üyeleri yönet</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}

              {/* Bildirimler */}
              <TouchableOpacity style={styles.settingsOption}>
                <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="notifications" size={24} color="#f59e0b" />
                </View>
                <View style={styles.settingsOptionInfo}>
                  <Text style={styles.settingsOptionTitle}>Bildirimler</Text>
                  <Text style={styles.settingsOptionSubtitle}>Grup bildirimlerini yönet</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#374151" />
              <Text style={styles.emptyText}>Henüz mesaj yok</Text>
              <Text style={styles.emptySubtext}>Grupta ilk mesajı siz gönderin!</Text>
            </View>
          }
        />

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <View style={styles.emojiPicker}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {EMOJI_LIST.map((emoji, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.emojiButton}
                    onPress={() => setInputText(prev => prev + emoji)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Attach Menu */}
        {showAttachMenu && (
          <View style={styles.attachMenu}>
            <TouchableOpacity style={styles.attachOption} onPress={pickImage}>
              <View style={[styles.attachIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="image" size={24} color="#10b981" />
              </View>
              <Text style={styles.attachText}>Fotoğraf</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={pickVideo}>
              <View style={[styles.attachIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <Ionicons name="videocam" size={24} color="#ef4444" />
              </View>
              <Text style={styles.attachText}>Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={pickDocument}>
              <View style={[styles.attachIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="document" size={24} color="#6366f1" />
              </View>
              <Text style={styles.attachText}>Dosya</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={() => setShowLocationPicker(true)}>
              <View style={[styles.attachIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                <Ionicons name="location" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.attachText}>Konum</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachOption} onPress={() => setShowPollModal(true)}>
              <View style={[styles.attachIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="bar-chart" size={24} color="#f59e0b" />
              </View>
              <Text style={styles.attachText}>Anket</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Uploading indicator */}
        {uploading && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.uploadingText}>Yükleniyor...</Text>
          </View>
        )}

        {/* Location loading indicator */}
        {loadingLocation && (
          <View style={styles.uploadingBar}>
            <ActivityIndicator size="small" color="#3b82f6" />
            <Text style={styles.uploadingText}>Konum alınıyor...</Text>
          </View>
        )}

        {/* Editing indicator */}
        {editingMessage && (
          <View style={styles.editingBar}>
            <View style={styles.editingInfo}>
              <Ionicons name="pencil" size={18} color="#6366f1" />
              <Text style={styles.editingText}>Mesaj düzenleniyor</Text>
            </View>
            <TouchableOpacity onPress={cancelEdit}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Reply indicator */}
        {replyingTo && (
          <View style={styles.replyBarContainer}>
            <View style={styles.replyBarContent}>
              <Ionicons name="arrow-undo" size={18} color="#10b981" />
              <View style={styles.replyBarInfo}>
                <Text style={styles.replyBarName}>{replyingTo.senderName}</Text>
                <Text style={styles.replyBarText} numberOfLines={1}>{replyingTo.content}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={cancelReply}>
              <Ionicons name="close" size={22} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* Smart Replies */}
        {smartReplies.length > 0 && !editingMessage && !inputText && (
          <View style={styles.smartRepliesContainer}>
            <View style={styles.smartRepliesHeader}>
              <Ionicons name="sparkles" size={14} color="#6366f1" />
              <Text style={styles.smartRepliesTitle}>Akıllı Yanıtlar</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.smartRepliesScroll}>
              {smartReplies.map((reply, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.smartReplyChip}
                  onPress={() => handleSelectSmartReply(reply)}
                >
                  <Text style={styles.smartReplyText}>{reply}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton} 
            onPress={() => { setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }}
          >
            <Ionicons name={showAttachMenu ? "close" : "attach"} size={26} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.emojiButton2} 
            onPress={() => { setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }}
          >
            <Ionicons name={showEmojiPicker ? "close" : "happy-outline"} size={26} color="#6b7280" />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            {/* @mention listesi */}
            {showMentionList && filteredMembers.length > 0 && (
              <View style={styles.mentionList}>
                <ScrollView keyboardShouldPersistTaps="handled" style={styles.mentionScroll}>
                  {filteredMembers.slice(0, 5).map((member) => (
                    <TouchableOpacity
                      key={member.uid}
                      style={styles.mentionItem}
                      onPress={() => handleSelectMention(member)}
                    >
                      <View style={styles.mentionAvatar}>
                        <Text style={styles.mentionAvatarText}>
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </Text>
                      </View>
                      <Text style={styles.mentionName}>{member.firstName} {member.lastName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <TextInput
              style={[styles.input, editingMessage && styles.inputEditing, replyingTo && styles.inputReplying]}
              placeholder={editingMessage ? "Mesajı düzenle..." : replyingTo ? "Yanıtınızı yazın..." : "Mesaj yaz... (@mention için @ kullanın)"}
              placeholderTextColor="#6b7280"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={1000}
            />
          </View>
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || sending) && styles.sendButtonDisabled, editingMessage && styles.editSendButton]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={editingMessage ? "checkmark" : "send"} size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Anket Oluşturma Modal */}
      <Modal
        visible={showPollModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPollModal(false)}
      >
        <View style={styles.pollModalOverlay}>
          <View style={styles.pollModalContent}>
            <View style={styles.pollModalHeader}>
              <Text style={styles.pollModalTitle}>Yeni Anket</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pollModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.pollInputLabel}>Soru</Text>
              <TextInput
                style={styles.pollInput}
                placeholder="Anket sorusunu yazın..."
                placeholderTextColor="#6b7280"
                value={pollQuestion}
                onChangeText={setPollQuestion}
                multiline
              />

              <Text style={styles.pollInputLabel}>Seçenekler</Text>
              {pollOptions.map((option, index) => (
                <View key={index} style={styles.pollOptionRow}>
                  <TextInput
                    style={styles.pollOptionInput}
                    placeholder={`Seçenek ${index + 1}`}
                    placeholderTextColor="#6b7280"
                    value={option}
                    onChangeText={(text) => {
                      const newOptions = [...pollOptions];
                      newOptions[index] = text;
                      setPollOptions(newOptions);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      style={styles.removeOptionBtn}
                      onPress={() => {
                        const newOptions = pollOptions.filter((_, i) => i !== index);
                        setPollOptions(newOptions);
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 6 && (
                <TouchableOpacity
                  style={styles.addOptionBtn}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Ionicons name="add-circle" size={22} color="#6366f1" />
                  <Text style={styles.addOptionText}>Seçenek Ekle</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.pollModalFooter}>
              <TouchableOpacity
                style={[styles.pollSubmitBtn, (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2) && styles.pollSubmitBtnDisabled]}
                onPress={handleCreatePoll}
                disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
              >
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.pollSubmitText}>Anketi Oluştur</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Harita ile Konum Seçme Modal */}
      <Modal
        visible={showLocationPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.locationModalHeader}>
              <Text style={styles.locationModalTitle}>Konum Paylaş</Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationOptions}>
              {/* Mevcut Konumu Gönder */}
              <TouchableOpacity
                style={styles.locationOptionBtn}
                onPress={() => shareLocation(false)}
                disabled={loadingLocation}
              >
                <View style={[styles.locationOptionIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  {loadingLocation ? (
                    <ActivityIndicator size="small" color="#3b82f6" />
                  ) : (
                    <Ionicons name="navigate" size={28} color="#3b82f6" />
                  )}
                </View>
                <View style={styles.locationOptionInfo}>
                  <Text style={styles.locationOptionTitle}>Mevcut Konumumu Gönder</Text>
                  <Text style={styles.locationOptionDesc}>Anlık konumunuzu paylaşın</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Canlı Konum */}
              <TouchableOpacity
                style={styles.locationOptionBtn}
                onPress={() => {
                  Alert.alert(
                    'Canlı Konum Süresi',
                    'Ne kadar süre canlı konum paylaşmak istersiniz?',
                    [
                      { text: 'İptal', style: 'cancel' },
                      { text: '15 dakika', onPress: () => shareLocation(true, 15) },
                      { text: '1 saat', onPress: () => shareLocation(true, 60) },
                      { text: '8 saat', onPress: () => shareLocation(true, 480) },
                    ]
                  );
                }}
                disabled={loadingLocation}
              >
                <View style={[styles.locationOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="radio" size={28} color="#10b981" />
                </View>
                <View style={styles.locationOptionInfo}>
                  <Text style={styles.locationOptionTitle}>Canlı Konum Paylaş</Text>
                  <Text style={styles.locationOptionDesc}>Gerçek zamanlı konum takibi</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              {/* Haritadan Seç - Harici harita uygulaması */}
              <TouchableOpacity
                style={styles.locationOptionBtn}
                onPress={async () => {
                  // Harita uygulamasını aç
                  const url = Platform.select({
                    ios: 'maps://',
                    android: 'geo:0,0?q=',
                  });
                  if (url) {
                    try {
                      await Linking.openURL(url);
                    } catch (e) {
                      Alert.alert('Hata', 'Harita uygulaması açılamadı');
                    }
                  }
                  // Sonra mevcut konumu gönder
                  setShowLocationPicker(false);
                  setShowAttachMenu(false);
                  Alert.alert(
                    'Konum Gönder',
                    'Harita uygulamasından konumu kopyaladıktan sonra mevcut konumunuzu göndermek ister misiniz?',
                    [
                      { text: 'Hayır', style: 'cancel' },
                      { text: 'Mevcut Konumu Gönder', onPress: () => shareLocation(false) },
                    ]
                  );
                }}
              >
                <View style={[styles.locationOptionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Ionicons name="map" size={28} color="#8b5cf6" />
                </View>
                <View style={styles.locationOptionInfo}>
                  <Text style={styles.locationOptionTitle}>Haritadan Seç</Text>
                  <Text style={styles.locationOptionDesc}>Harita uygulamasını açın</Text>
                </View>
                <Ionicons name="open-outline" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { marginRight: 12 },
  menuButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  groupIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center' },
  avatarSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 8 },
  avatarImage: { width: '100%', height: '100%' },
  headerInfo: { flex: 1, marginLeft: 12 },
  headerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerSubtitle: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  keyboardView: { flex: 1 },
  // Telegram tarzı sohbet arka planı
  messagesList: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1, backgroundColor: '#0d1117' },
  messageContainer: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  myMessageContainer: { flexDirection: 'row-reverse' },
  messageBubble: { 
    maxWidth: '78%', 
    paddingHorizontal: 14, 
    paddingVertical: 10, 
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  // Telegram mavi rengi - gönderen için
  myBubble: { 
    backgroundColor: '#2b5278',  // Telegram mavisi
    borderBottomRightRadius: 4,
    marginLeft: 48,
  },
  // Telegram gri rengi - alıcı için
  otherBubble: { 
    backgroundColor: '#182533',  // Telegram koyu gri
    borderBottomLeftRadius: 4,
    marginRight: 48,
  },
  senderName: { color: '#71a8e0', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
  senderInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  occupationBadge: { backgroundColor: 'rgba(113, 168, 224, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  occupationText: { color: '#8ab4e8', fontSize: 10, fontWeight: '600' },
  pinnedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 6, gap: 4, alignSelf: 'flex-start' },
  pinnedText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
  messageText: { color: '#ffffff', fontSize: 15, lineHeight: 21, letterSpacing: 0.1 },
  myMessageText: { color: '#ffffff' },
  mentionHighlight: { color: '#6eb5ff', fontWeight: '700', backgroundColor: 'rgba(110, 181, 255, 0.2)', borderRadius: 4, paddingHorizontal: 3 },
  myMentionHighlight: { color: '#a5d6ff', backgroundColor: 'rgba(165, 214, 255, 0.2)' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5, gap: 5 },
  messageTime: { color: '#6e8aa5', fontSize: 11, fontWeight: '500' },
  myMessageTime: { color: 'rgba(255, 255, 255, 0.55)' },
  editedLabel: { color: '#6e8aa5', fontSize: 10, fontStyle: 'italic' },
  myEditedLabel: { color: 'rgba(255, 255, 255, 0.45)' },
  // Okundu tikleri - Telegram açık mavi
  readReceipt: { flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  readReceiptIcon: { color: '#5eb5f7' },  // Telegram açık mavi tick rengi
  sentReceiptIcon: { color: '#6e8aa5' },  // Gönderildi (tek tik) - gri
  messageImage: { width: 220, height: 220, borderRadius: 16, marginBottom: 8 },
  videoContainer: { width: 220, height: 160, borderRadius: 16, overflow: 'hidden', marginBottom: 8 },
  messageVideo: { width: '100%', height: '100%' },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(94, 181, 247, 0.12)', padding: 12, borderRadius: 14, marginBottom: 8, gap: 10 },
  fileName: { color: '#e2e8f0', fontSize: 14, flex: 1 },
  // Reply Preview styles - Modern Telegram style
  replyPreview: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 10, marginBottom: 8, flexDirection: 'row', borderLeftWidth: 3, borderLeftColor: '#5eb5f7' },
  myReplyPreview: { backgroundColor: 'rgba(255,255,255,0.08)', borderLeftColor: '#8ab4e8' },
  replyBar: { width: 0, marginRight: 0 },
  replyContent: { flex: 1 },
  replyName: { color: '#5eb5f7', fontSize: 12, fontWeight: '700', marginBottom: 3 },
  replyText: { color: '#94a3b8', fontSize: 13, lineHeight: 17 },
  // Reply Bar (Input area)
  replyBarContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', padding: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
  replyBarContent: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  replyBarInfo: { flex: 1 },
  replyBarName: { color: '#10b981', fontSize: 13, fontWeight: '600' },
  replyBarText: { color: '#9ca3af', fontSize: 13 },
  inputReplying: { borderColor: '#10b981', borderWidth: 1 },
  // Smart Replies styles
  smartRepliesContainer: { backgroundColor: '#111827', paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
  smartRepliesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  smartRepliesTitle: { color: '#6366f1', fontSize: 12, fontWeight: '600' },
  smartRepliesScroll: { flexDirection: 'row' },
  smartReplyChip: { backgroundColor: 'rgba(99, 102, 241, 0.1)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  smartReplyText: { color: '#a5b4fc', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64 },
  emptyText: { color: '#9ca3af', fontSize: 16, marginTop: 16 },
  emptySubtext: { color: '#6b7280', fontSize: 13, marginTop: 8 },
  emojiPicker: { backgroundColor: '#111827', padding: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emojiButton: { padding: 8 },
  emojiButton2: { padding: 8 },
  emoji: { fontSize: 24 },
  attachMenu: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#111827', padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  attachOption: { alignItems: 'center', gap: 8 },
  attachIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  attachText: { color: '#9ca3af', fontSize: 12 },
  uploadingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827', padding: 10, gap: 8 },
  uploadingText: { color: '#6366f1', fontSize: 14 },
  editingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', padding: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
  editingInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editingText: { color: '#6366f1', fontSize: 14 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#1f2937', gap: 4 },
  attachButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrapper: { flex: 1, position: 'relative' },
  input: { backgroundColor: '#1f2937', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15, maxHeight: 100 },
  inputEditing: { borderWidth: 1, borderColor: '#6366f1' },
  mentionList: { position: 'absolute', bottom: '100%', left: 0, right: 0, backgroundColor: '#1f2937', borderRadius: 12, marginBottom: 4, maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  mentionScroll: { maxHeight: 200 },
  mentionItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#374151' },
  mentionAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  mentionAvatarText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  mentionName: { color: '#fff', fontSize: 14 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  editSendButton: { backgroundColor: '#10b981' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  actionsModal: { backgroundColor: '#1f2937', borderRadius: 20, padding: 20, width: '80%', maxWidth: 320 },
  actionsTitle: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14, borderRadius: 12 },
  actionText: { color: '#e5e7eb', fontSize: 16 },
  deleteAction: { borderTopWidth: 1, borderTopColor: '#374151', marginTop: 8, paddingTop: 16 },
  deleteText: { color: '#ef4444' },
  // Quick Reactions
  quickReactionsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  quickReactionButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  quickReactionEmoji: { fontSize: 22 },
  // Reactions on messages
  reactionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  reactionBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.2)', borderRadius: 12, paddingHorizontal: 6, paddingVertical: 2 },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, color: '#9ca3af', marginLeft: 2 },
  // Location message
  locationMessage: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 12, gap: 10, marginBottom: 4 },
  locationIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  liveBadge: { position: 'absolute', bottom: -4, backgroundColor: '#10b981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  liveText: { fontSize: 8, fontWeight: '700', color: '#fff' },
  locationInfo: { flex: 1 },
  locationTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  locationAddress: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  locationCoords: { color: '#6b7280', fontSize: 10, marginTop: 2, fontFamily: 'monospace' },
  // Forward Modal
  forwardModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  forwardModalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingBottom: 40 },
  forwardModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  forwardModalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  forwardPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', margin: 16, padding: 12, borderRadius: 12, gap: 8 },
  forwardPreviewText: { color: '#9ca3af', fontSize: 14, flex: 1 },
  forwardTargetList: { paddingHorizontal: 16 },
  forwardTargetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  forwardTargetAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  forwardTargetName: { flex: 1, color: '#fff', fontSize: 16 },
  // Group Settings Modal styles
  groupImageSmall: { width: 40, height: 40, borderRadius: 12 },
  editBadgeSmall: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#0a0a0a' },
  settingsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  settingsContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  settingsTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  settingsBody: { padding: 16, gap: 12 },
  groupProfileSection: { alignItems: 'center', marginBottom: 16, position: 'relative' },
  groupImageLarge: { width: 80, height: 80, borderRadius: 20 },
  groupIconLarge: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center' },
  editBadgeLarge: { position: 'absolute', bottom: 0, right: '50%', marginRight: -40, width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#1f2937' },
  groupNameSettings: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginTop: 12 },
  groupMemberCount: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 4 },
  settingsOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', padding: 16, borderRadius: 12 },
  settingsIconWrapper: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  settingsOptionInfo: { flex: 1, marginLeft: 12 },
  settingsOptionTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  settingsOptionSubtitle: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  // Poll Modal Styles
  pollModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  pollModalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  pollModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  pollModalTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  pollModalBody: { padding: 20 },
  pollInputLabel: { color: '#9ca3af', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  pollInput: { backgroundColor: '#111827', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 20 },
  pollOptionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  pollOptionInput: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16 },
  removeOptionBtn: { marginLeft: 12 },
  addOptionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  addOptionText: { color: '#6366f1', fontSize: 15, fontWeight: '500' },
  pollModalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#374151' },
  pollSubmitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, gap: 8 },
  pollSubmitBtnDisabled: { backgroundColor: '#374151' },
  pollSubmitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Location Modal Styles
  locationModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  locationModalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  locationModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  locationModalTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  locationOptions: { padding: 16 },
  locationOptionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  locationOptionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  locationOptionInfo: { flex: 1, marginLeft: 14 },
  locationOptionTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  locationOptionDesc: { color: '#6b7280', fontSize: 13, marginTop: 2 },
});
