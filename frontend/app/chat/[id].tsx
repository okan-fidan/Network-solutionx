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
  Pressable,
  Modal,
  Animated,
  Dimensions,
  Vibration,
  Linking,
  ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { conversationApi, userListApi, userInteractionApi, notificationApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file' | 'deleted' | 'location';
  mediaUrl?: string;
  read: boolean;
  reactions?: { [emoji: string]: string[] };
  replyTo?: {
    id: string;
    content: string;
    senderName: string;
    senderId: string;
  };
  edited?: boolean;
  deletedForAll?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  city?: string;
  occupation?: string;
}

interface ConversationData {
  id: string;
  type: string;
  participants: string[];
  otherUser: {
    uid: string;
    name: string;
    profileImageUrl?: string;
  };
}

const EMOJI_LIST = ['❤️', '👍', '😂', '😮', '😢', '🙏'];
const REPORT_REASONS = [
  'Spam veya reklam',
  'Taciz veya zorbalık',
  'Uygunsuz içerik',
  'Dolandırıcılık',
  'Sahte profil',
  'Diğer'
];

export default function PrivateChatScreen() {
  const { id: otherUserId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [userStatus, setUserStatus] = useState<{ isBlocked: boolean; isMuted: boolean; muteDuration: string | null }>({
    isBlocked: false,
    isMuted: false,
    muteDuration: null
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const { userProfile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const menuAnimation = useRef(new Animated.Value(0)).current;

  // Push notification token kaydet
  useEffect(() => {
    registerForPushNotifications();
  }, []);

  const registerForPushNotifications = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        return;
      }
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id' // Expo projectId
      });
      
      if (token.data) {
        await notificationApi.savePushToken(token.data);
      }
    } catch (error) {
      console.log('Push notification registration error:', error);
    }
  };

  // Konuşmayı başlat
  const initConversation = useCallback(async () => {
    if (!otherUserId || !user) return;

    try {
      const userRes = await userListApi.getOne(otherUserId);
      setOtherUser(userRes.data);

      const convRes = await conversationApi.start({ 
        otherUserId, 
        type: 'private' 
      });
      setConversation(convRes.data);
      
      await loadMessages(convRes.data.id);
      
      // Kullanıcı durumunu kontrol et
      try {
        const statusRes = await userInteractionApi.getUserStatus(otherUserId);
        setUserStatus(statusRes.data);
      } catch (e) {
        // Sessizce devam et
      }
    } catch (error: any) {
      console.error('Error initializing conversation:', error);
      Alert.alert('Hata', 'Sohbet başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, [otherUserId, user]);

  // Mesajları yükle
  const loadMessages = async (conversationId: string) => {
    try {
      const res = await conversationApi.getMessages(conversationId);
      const formattedMessages = (res.data || [])
        .filter((msg: any) => {
          if (msg.deletedFor && msg.deletedFor.includes(user?.uid)) {
            return false;
          }
          return true;
        })
        .map((msg: any) => ({
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderImage: msg.senderImage,
          content: msg.deletedForAll ? 'Bu mesaj silindi' : msg.content,
          timestamp: new Date(msg.timestamp),
          type: msg.deletedForAll ? 'deleted' : (msg.type || 'text'),
          mediaUrl: msg.mediaUrl,
          read: msg.read,
          reactions: msg.reactions || {},
          replyTo: msg.replyTo,
          edited: msg.edited,
          deletedForAll: msg.deletedForAll,
          location: msg.location,
        }));
      setMessages(formattedMessages);
      
      // Konuşmayı okundu olarak işaretle
      try {
        await conversationApi.markAsRead(conversationId);
      } catch (e) {
        // Sessizce devam et
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  useEffect(() => {
    initConversation();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [initConversation]);

  useEffect(() => {
    if (conversation?.id) {
      pollingRef.current = setInterval(() => {
        loadMessages(conversation.id);
      }, 2000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [conversation?.id]);

  // Mesaj gönder
  const handleSend = async () => {
    if (!inputText.trim() || !conversation?.id || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      let res;
      if (replyingTo) {
        res = await conversationApi.replyToMessage(conversation.id, replyingTo.id, {
          content: messageText,
          type: 'text',
        });
        setReplyingTo(null);
      } else {
        res = await conversationApi.sendMessage(conversation.id, {
          content: messageText,
          type: 'text',
        });
      }

      const newMessage: Message = {
        id: res.data.id,
        senderId: user?.uid || '',
        senderName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
        senderImage: userProfile?.profileImageUrl,
        content: messageText,
        timestamp: new Date(),
        type: 'text',
        read: false,
        reactions: {},
        replyTo: replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderName,
          senderId: replyingTo.senderId,
        } : undefined,
      };

      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
      setInputText(messageText);
    } finally {
      setSending(false);
    }
  };

  // Fotoğraf gönder
  const handleSendPhoto = async () => {
    setShowAttachMenu(false);
    
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Galeri erişimi için izin vermeniz gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets[0] && conversation) {
      setSending(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const uploadRes = await conversationApi.uploadMedia(conversation.id, formData);
        
        await conversationApi.sendMessage(conversation.id, {
          content: '📷 Fotoğraf',
          type: 'image',
          mediaUrl: uploadRes.data.url,
        });

        await loadMessages(conversation.id);
      } catch (error) {
        console.error('Error sending photo:', error);
        Alert.alert('Hata', 'Fotoğraf gönderilemedi.');
      } finally {
        setSending(false);
      }
    }
  };

  // Kamera ile fotoğraf çek
  const handleTakePhoto = async () => {
    setShowAttachMenu(false);
    
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('İzin Gerekli', 'Kamera erişimi için izin vermeniz gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0] && conversation) {
      setSending(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        } as any);

        const uploadRes = await conversationApi.uploadMedia(conversation.id, formData);
        
        await conversationApi.sendMessage(conversation.id, {
          content: '📷 Fotoğraf',
          type: 'image',
          mediaUrl: uploadRes.data.url,
        });

        await loadMessages(conversation.id);
      } catch (error) {
        console.error('Error sending photo:', error);
        Alert.alert('Hata', 'Fotoğraf gönderilemedi.');
      } finally {
        setSending(false);
      }
    }
  };

  // Dosya gönder
  const handleSendDocument = async () => {
    setShowAttachMenu(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0] && conversation) {
        setSending(true);
        const asset = result.assets[0];
        
        const formData = new FormData();
        formData.append('file', {
          uri: asset.uri,
          type: asset.mimeType || 'application/octet-stream',
          name: asset.name,
        } as any);

        const uploadRes = await conversationApi.uploadMedia(conversation.id, formData);
        
        await conversationApi.sendMessage(conversation.id, {
          content: `📎 ${asset.name}`,
          type: 'file',
          mediaUrl: uploadRes.data.url,
        });

        await loadMessages(conversation.id);
      }
    } catch (error) {
      console.error('Error sending document:', error);
      Alert.alert('Hata', 'Dosya gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  // Konum gönder
  const handleSendLocation = async () => {
    setShowAttachMenu(false);
    
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Konum erişimi için izin vermeniz gerekiyor.');
      return;
    }

    setSending(true);
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Adres al
      let address = '';
      try {
        const addresses = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (addresses[0]) {
          const addr = addresses[0];
          address = [addr.street, addr.district, addr.city].filter(Boolean).join(', ');
        }
      } catch (e) {
        // Adres alınamazsa devam et
      }

      if (conversation) {
        await conversationApi.sendLocation(conversation.id, {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address,
        });
        await loadMessages(conversation.id);
      }
    } catch (error) {
      console.error('Error sending location:', error);
      Alert.alert('Hata', 'Konum gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  // Konumu haritada aç
  const openLocationInMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}`,
    });
    if (url) Linking.openURL(url);
  };

  // Mesaja uzun basma
  const handleLongPress = (message: Message) => {
    if (message.type === 'deleted') return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      Vibration.vibrate(50);
    }
    
    setSelectedMessage(message);
    setShowMessageMenu(true);
    Animated.spring(menuAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(menuAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowMessageMenu(false);
      setSelectedMessage(null);
    });
  };

  // Emoji reaksiyon
  const handleReaction = async (emoji: string) => {
    if (!selectedMessage || !conversation?.id) {
      console.log('Reaction failed: No conversation or message', { conversation, selectedMessage });
      Alert.alert('Hata', 'Reaksiyon eklenemedi');
      closeMenu();
      return;
    }

    try {
      console.log('Adding reaction:', { conversationId: conversation.id, messageId: selectedMessage.id, emoji });
      await conversationApi.reactToMessage(conversation.id, selectedMessage.id, emoji);
      
      setMessages(prev => prev.map(msg => {
        if (msg.id === selectedMessage.id) {
          const reactions = { ...msg.reactions };
          const userId = user?.uid || '';
          
          Object.keys(reactions).forEach(em => {
            if (reactions[em]?.includes(userId)) {
              reactions[em] = reactions[em].filter(id => id !== userId);
              if (reactions[em].length === 0) delete reactions[em];
            }
          });
          
          if (!reactions[emoji]) reactions[emoji] = [];
          if (!reactions[emoji].includes(userId)) {
            reactions[emoji].push(userId);
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));
      
      closeMenu();
    } catch (error: any) {
      console.error('Error adding reaction:', error?.response?.data || error);
      Alert.alert('Hata', 'Reaksiyon eklenemedi');
      closeMenu();
    }
  };

  // Mesaj silme
  const handleDelete = async (deleteForAll: boolean) => {
    if (!selectedMessage || !conversation) return;

    Alert.alert(
      'Mesajı Sil',
      deleteForAll ? 'Bu mesaj herkes için silinecek.' : 'Bu mesaj sadece sizin için silinecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await conversationApi.deleteMessage(conversation.id, selectedMessage.id, deleteForAll);
              
              if (deleteForAll) {
                setMessages(prev => prev.map(msg => 
                  msg.id === selectedMessage.id 
                    ? { ...msg, content: 'Bu mesaj silindi', type: 'deleted', deletedForAll: true }
                    : msg
                ));
              } else {
                setMessages(prev => prev.filter(msg => msg.id !== selectedMessage.id));
              }
              
              closeMenu();
            } catch (error) {
              Alert.alert('Hata', 'Mesaj silinemedi.');
            }
          }
        }
      ]
    );
  };

  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    closeMenu();
  };

  // Profil aç
  const openProfile = () => {
    if (otherUser) {
      router.push(`/profile/${otherUser.uid}`);
    }
  };

  // Kullanıcıyı engelle
  const handleBlock = async () => {
    setShowOptionsMenu(false);
    
    Alert.alert(
      'Kullanıcıyı Engelle',
      `${otherUser?.firstName} ${otherUser?.lastName} engellensin mi? Bu kişi size mesaj gönderemeyecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              await userInteractionApi.blockUser(otherUserId!);
              setUserStatus(prev => ({ ...prev, isBlocked: true }));
              Alert.alert('Başarılı', 'Kullanıcı engellendi.');
              router.back();
            } catch (error) {
              Alert.alert('Hata', 'Engellenemedi.');
            }
          }
        }
      ]
    );
  };

  // Sessize al
  const handleMute = async (duration: string) => {
    setShowOptionsMenu(false);
    
    try {
      await userInteractionApi.muteUser(otherUserId!, duration);
      setUserStatus(prev => ({ ...prev, isMuted: true, muteDuration: duration }));
      
      const durationText = duration === '8h' ? '8 saat' : duration === '1w' ? '1 hafta' : 'süresiz';
      Alert.alert('Başarılı', `Bildirimler ${durationText} sessize alındı.`);
    } catch (error) {
      Alert.alert('Hata', 'Sessize alınamadı.');
    }
  };

  // Şikayet et
  const handleReport = async () => {
    if (!selectedReportReason) {
      Alert.alert('Hata', 'Lütfen bir sebep seçin.');
      return;
    }

    try {
      await userInteractionApi.reportUser(otherUserId!, {
        reason: selectedReportReason,
        description: reportDescription,
      });
      
      setShowReportModal(false);
      setSelectedReportReason('');
      setReportDescription('');
      Alert.alert('Başarılı', 'Şikayetiniz alındı. En kısa sürede incelenecektir.');
    } catch (error) {
      Alert.alert('Hata', 'Şikayet gönderilemedi.');
    }
  };

  // Mesaj render
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?.uid;
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderId !== item.senderId);
    const hasReactions = Object.keys(item.reactions || {}).length > 0;

    return (
      <Pressable
        onLongPress={() => handleLongPress(item)}
        delayLongPress={300}
        style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
      >
        {!isMe && showAvatar && (
          <TouchableOpacity onPress={openProfile} style={styles.avatarContainer}>
            {item.senderImage ? (
              <Image source={{ uri: item.senderImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                <Ionicons name="person" size={14} color={colors.textSecondary} />
              </View>
            )}
          </TouchableOpacity>
        )}
        {!isMe && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={{ maxWidth: '75%' }}>
          {item.replyTo && (
            <View style={[styles.replyPreview, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.replyBar, { backgroundColor: colors.primary }]} />
              <View style={styles.replyContent}>
                <Text style={[styles.replyName, { color: colors.primary }]} numberOfLines={1}>
                  {item.replyTo.senderId === user?.uid ? 'Sen' : item.replyTo.senderName}
                </Text>
                <Text style={[styles.replyText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {item.replyTo.content}
                </Text>
              </View>
            </View>
          )}

          <View style={[
            styles.messageBubble,
            isMe 
              ? [styles.messageBubbleMe, { backgroundColor: colors.primary }] 
              : [styles.messageBubbleOther, { backgroundColor: colors.card }],
            item.type === 'deleted' && styles.deletedBubble
          ]}>
            {item.type === 'deleted' ? (
              <View style={styles.deletedContent}>
                <Ionicons name="ban-outline" size={14} color={colors.textSecondary} />
                <Text style={[styles.deletedText, { color: colors.textSecondary }]}>
                  Bu mesaj silindi
                </Text>
              </View>
            ) : item.type === 'location' && item.location ? (
              <TouchableOpacity 
                onPress={() => openLocationInMaps(item.location!.latitude, item.location!.longitude)}
                style={styles.locationContent}
              >
                <View style={[styles.locationIcon, { backgroundColor: isMe ? 'rgba(255,255,255,0.2)' : colors.background }]}>
                  <Ionicons name="location" size={24} color={isMe ? '#fff' : colors.primary} />
                </View>
                <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
                  📍 {item.location.address || 'Konum paylaşıldı'}
                </Text>
                <Text style={[styles.locationHint, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                  Haritada aç
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                {item.type === 'image' && item.mediaUrl && (
                  <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} resizeMode="cover" />
                )}
                {item.type === 'file' && (
                  <View style={styles.fileContent}>
                    <Ionicons name="document" size={24} color={isMe ? '#fff' : colors.primary} />
                  </View>
                )}
                <Text style={[styles.messageText, { color: isMe ? '#fff' : colors.text }]}>
                  {item.content}
                </Text>
                <View style={styles.messageFooter}>
                  {item.edited && (
                    <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
                      düzenlendi
                    </Text>
                  )}
                  <Text style={[styles.messageTime, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }]}>
                    {format(item.timestamp, 'HH:mm')}
                  </Text>
                  {isMe && (
                    <View style={styles.readReceipt}>
                      <Ionicons 
                        name={item.read ? 'checkmark-done' : 'checkmark'} 
                        size={16} 
                        color={item.read ? '#5eb5f7' : '#6e8aa5'}
                      />
                    </View>
                  )}
                </View>
              </>
            )}
          </View>

          {hasReactions && (
            <View style={[styles.reactionsContainer, isMe && styles.reactionsContainerMe]}>
              {Object.entries(item.reactions || {}).map(([emoji, users]) => (
                <View key={emoji} style={styles.reactionBubble}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {users.length > 1 && (
                    <Text style={styles.reactionCount}>{users.length}</Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  // Header
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerProfile} onPress={openProfile} activeOpacity={0.7}>
        {otherUser?.profileImageUrl ? (
          <Image source={{ uri: otherUser.profileImageUrl }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatarPlaceholder, { backgroundColor: colors.background }]}>
            <Ionicons name="person" size={20} color={colors.textSecondary} />
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
            {otherUser ? `${otherUser.firstName} ${otherUser.lastName}` : 'Yükleniyor...'}
          </Text>
          {otherUser?.city && (
            <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>
              {userStatus.isMuted ? '🔇 Sessize alındı' : otherUser.city}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerAction} onPress={() => setShowOptionsMenu(true)}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  // Ekleme menüsü
  const renderAttachMenu = () => (
    <Modal visible={showAttachMenu} transparent animationType="fade" onRequestClose={() => setShowAttachMenu(false)}>
      <Pressable style={styles.menuOverlay} onPress={() => setShowAttachMenu(false)}>
        <View style={[styles.attachMenuContainer, { backgroundColor: colors.card }]}>
          <View style={styles.attachMenuRow}>
            <TouchableOpacity style={styles.attachButton} onPress={handleTakePhoto}>
              <View style={[styles.attachIcon, { backgroundColor: '#6366f1' }]}>
                <Ionicons name="camera" size={24} color="#fff" />
              </View>
              <Text style={[styles.attachLabel, { color: colors.text }]}>Kamera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachButton} onPress={handleSendPhoto}>
              <View style={[styles.attachIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="image" size={24} color="#fff" />
              </View>
              <Text style={[styles.attachLabel, { color: colors.text }]}>Galeri</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachButton} onPress={handleSendDocument}>
              <View style={[styles.attachIcon, { backgroundColor: '#ec4899' }]}>
                <Ionicons name="document" size={24} color="#fff" />
              </View>
              <Text style={[styles.attachLabel, { color: colors.text }]}>Dosya</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.attachButton} onPress={handleSendLocation}>
              <View style={[styles.attachIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="location" size={24} color="#fff" />
              </View>
              <Text style={[styles.attachLabel, { color: colors.text }]}>Konum</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  // 3 nokta menüsü
  const renderOptionsMenu = () => (
    <Modal visible={showOptionsMenu} transparent animationType="fade" onRequestClose={() => setShowOptionsMenu(false)}>
      <Pressable style={styles.menuOverlay} onPress={() => setShowOptionsMenu(false)}>
        <View style={[styles.optionsMenuContainer, { backgroundColor: colors.card }]}>
          <TouchableOpacity style={styles.optionItem} onPress={openProfile}>
            <Ionicons name="person-outline" size={20} color={colors.text} />
            <Text style={[styles.optionText, { color: colors.text }]}>Profili Görüntüle</Text>
          </TouchableOpacity>

          <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />

          {userStatus.isMuted ? (
            <TouchableOpacity style={styles.optionItem} onPress={async () => {
              await userInteractionApi.unmuteUser(otherUserId!);
              setUserStatus(prev => ({ ...prev, isMuted: false }));
              setShowOptionsMenu(false);
            }}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              <Text style={[styles.optionText, { color: colors.text }]}>Sessize Almayı Kaldır</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleMute('8h')}>
                <Ionicons name="notifications-off-outline" size={20} color={colors.text} />
                <Text style={[styles.optionText, { color: colors.text }]}>8 Saat Sessize Al</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleMute('1w')}>
                <Ionicons name="notifications-off-outline" size={20} color={colors.text} />
                <Text style={[styles.optionText, { color: colors.text }]}>1 Hafta Sessize Al</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => handleMute('forever')}>
                <Ionicons name="notifications-off" size={20} color={colors.text} />
                <Text style={[styles.optionText, { color: colors.text }]}>Süresiz Sessize Al</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={[styles.optionDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity style={styles.optionItem} onPress={() => {
            setShowOptionsMenu(false);
            setShowReportModal(true);
          }}>
            <Ionicons name="flag-outline" size={20} color="#f59e0b" />
            <Text style={[styles.optionText, { color: '#f59e0b' }]}>Şikayet Et</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.optionItem} onPress={handleBlock}>
            <Ionicons name="ban-outline" size={20} color="#ef4444" />
            <Text style={[styles.optionText, { color: '#ef4444' }]}>Engelle</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );

  // Şikayet modali
  const renderReportModal = () => (
    <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
      <View style={styles.reportModalOverlay}>
        <View style={[styles.reportModalContent, { backgroundColor: colors.card }]}>
          <View style={styles.reportModalHeader}>
            <Text style={[styles.reportModalTitle, { color: colors.text }]}>Kullanıcıyı Şikayet Et</Text>
            <TouchableOpacity onPress={() => setShowReportModal(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.reportLabel, { color: colors.textSecondary }]}>Şikayet Sebebi</Text>
          {REPORT_REASONS.map(reason => (
            <TouchableOpacity 
              key={reason} 
              style={[
                styles.reportReasonItem,
                selectedReportReason === reason && { backgroundColor: colors.primary + '20' }
              ]}
              onPress={() => setSelectedReportReason(reason)}
            >
              <Ionicons 
                name={selectedReportReason === reason ? 'radio-button-on' : 'radio-button-off'} 
                size={20} 
                color={selectedReportReason === reason ? colors.primary : colors.textSecondary} 
              />
              <Text style={[styles.reportReasonText, { color: colors.text }]}>{reason}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.reportLabel, { color: colors.textSecondary, marginTop: 16 }]}>Ek Açıklama (Opsiyonel)</Text>
          <TextInput
            style={[styles.reportInput, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Detay ekleyin..."
            placeholderTextColor={colors.textSecondary}
            value={reportDescription}
            onChangeText={setReportDescription}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity 
            style={[styles.reportSubmitButton, { backgroundColor: colors.primary }]}
            onPress={handleReport}
          >
            <Text style={styles.reportSubmitText}>Şikayeti Gönder</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Reply bar
  const renderReplyBar = () => {
    if (!replyingTo) return null;

    return (
      <View style={[styles.replyBar2, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={[styles.replyBarLine, { backgroundColor: colors.primary }]} />
        <View style={styles.replyBarContent}>
          <Text style={[styles.replyBarTitle, { color: colors.primary }]}>
            {replyingTo.senderId === user?.uid ? 'Kendine yanıtla' : replyingTo.senderName}
          </Text>
          <Text style={[styles.replyBarText, { color: colors.textSecondary }]} numberOfLines={1}>
            {replyingTo.content}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setReplyingTo(null)} style={styles.replyBarClose}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  // Input bar
  const renderInputBar = () => (
    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <TouchableOpacity style={styles.attachTrigger} onPress={() => setShowAttachMenu(true)}>
        <Ionicons name="add-circle" size={28} color={colors.primary} />
      </TouchableOpacity>

      <View style={[styles.inputWrapper, { backgroundColor: colors.background }]}>
        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          placeholder="Mesaj yazın..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={1000}
        />
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.sendButton,
          { backgroundColor: colors.primary },
          (!inputText.trim() || sending) && styles.sendButtonDisabled,
          pressed && { opacity: 0.8 }
        ]}
        onPress={handleSend}
        disabled={!inputText.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="send" size={18} color="#fff" />
        )}
      </Pressable>
    </View>
  );

  // Mesaj menüsü
  const renderMessageMenu = () => {
    if (!showMessageMenu || !selectedMessage) return null;
    const isMe = selectedMessage.senderId === user?.uid;

    return (
      <Modal transparent visible={showMessageMenu} animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.menuOverlay} onPress={closeMenu}>
          <Animated.View style={[styles.menuContainer, { backgroundColor: colors.card, transform: [{ scale: menuAnimation }], opacity: menuAnimation }]}>
            <View style={styles.emojiRow}>
              {EMOJI_LIST.map(emoji => (
                <TouchableOpacity key={emoji} style={styles.emojiButton} onPress={() => handleReaction(emoji)}>
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            <TouchableOpacity style={styles.menuItem} onPress={handleReply}>
              <Ionicons name="return-up-back" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Yanıtla</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={closeMenu}>
              <Ionicons name="copy-outline" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Kopyala</Text>
            </TouchableOpacity>

            {isMe && (
              <>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(false)}>
                  <Ionicons name="trash-outline" size={20} color={colors.text} />
                  <Text style={[styles.menuText, { color: colors.text }]}>Benim için sil</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(true)}>
                  <Ionicons name="trash" size={20} color="#ef4444" />
                  <Text style={[styles.menuText, { color: '#ef4444' }]}>Herkes için sil</Text>
                </TouchableOpacity>
              </>
            )}

            {!isMe && (
              <TouchableOpacity style={styles.menuItem} onPress={() => handleDelete(false)}>
                <Ionicons name="trash-outline" size={20} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>Sil</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Sohbet yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {renderHeader()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz mesaj yok</Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Sohbete başlamak için bir mesaj gönderin
              </Text>
            </View>
          }
        />

        {renderReplyBar()}
        {renderInputBar()}
      </KeyboardAvoidingView>

      {renderMessageMenu()}
      {renderAttachMenu()}
      {renderOptionsMenu()}
      {renderReportModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  keyboardView: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: 1 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerProfile: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 4 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerAvatarPlaceholder: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerInfo: { marginLeft: 12, flex: 1 },
  headerName: { fontSize: 16, fontWeight: '600' },
  headerStatus: { fontSize: 12, marginTop: 2 },
  headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  messagesList: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },
  messageRow: { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowOther: { justifyContent: 'flex-start' },
  avatarContainer: { marginRight: 8 },
  avatarSpacer: { width: 28, marginRight: 8 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  replyPreview: { flexDirection: 'row', borderRadius: 10, marginBottom: 6, overflow: 'hidden', borderLeftWidth: 3, borderLeftColor: '#5eb5f7' },
  replyBar: { width: 0 },
  replyContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.2)' },
  replyName: { fontSize: 12, fontWeight: '700', color: '#5eb5f7' },
  replyText: { fontSize: 12, marginTop: 2, color: '#9ca3af' },
  // Telegram tarzı mesaj balonları
  messageBubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, minWidth: 60, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 },
  messageBubbleMe: { borderBottomRightRadius: 4, backgroundColor: '#2b5278' },  // Telegram mavi
  messageBubbleOther: { borderBottomLeftRadius: 4, backgroundColor: '#182533' },  // Telegram koyu gri
  deletedBubble: { opacity: 0.7 },
  deletedContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deletedText: { fontSize: 14, fontStyle: 'italic' },
  locationContent: { alignItems: 'center', paddingVertical: 8 },
  locationIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  locationHint: { fontSize: 12, marginTop: 4 },
  fileContent: { alignItems: 'center', marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 21, color: '#ffffff' },
  messageImage: { width: 220, height: 220, borderRadius: 14, marginBottom: 6 },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 5, gap: 5 },
  editedLabel: { fontSize: 10, fontStyle: 'italic', color: '#6e8aa5' },
  messageTime: { fontSize: 11, color: '#6e8aa5' },
  // Okundu tikleri - Telegram açık mavi
  readReceipt: { marginLeft: 4 },
  readReceiptIcon: { color: '#5eb5f7' },
  sentReceiptIcon: { color: '#6e8aa5' },
  reactionsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, gap: 4 },
  reactionsContainerMe: { justifyContent: 'flex-end' },
  reactionBubble: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, backgroundColor: 'rgba(94, 181, 247, 0.15)' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 11, marginLeft: 2, color: '#5eb5f7' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 16, fontWeight: '500', marginTop: 16 },
  emptySubtext: { fontSize: 14, marginTop: 4 },
  replyBar2: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1 },
  replyBarLine: { width: 3, height: 36, borderRadius: 2 },
  replyBarContent: { flex: 1, marginLeft: 8 },
  replyBarTitle: { fontSize: 13, fontWeight: '600' },
  replyBarText: { fontSize: 13, marginTop: 2 },
  replyBarClose: { padding: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 8, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  attachTrigger: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  inputWrapper: { flex: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, minHeight: 44, maxHeight: 120, justifyContent: 'center' },
  textInput: { fontSize: 15, lineHeight: 20, maxHeight: 100 },
  sendButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendButtonDisabled: { opacity: 0.5 },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  menuContainer: { width: SCREEN_WIDTH * 0.8, maxWidth: 300, borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, paddingHorizontal: 8 },
  emojiButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  emojiText: { fontSize: 24 },
  menuDivider: { height: 1, marginVertical: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  menuText: { fontSize: 15 },
  attachMenuContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, borderRadius: 16, padding: 20 },
  attachMenuRow: { flexDirection: 'row', justifyContent: 'space-around' },
  attachButton: { alignItems: 'center', gap: 8 },
  attachIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  attachLabel: { fontSize: 12 },
  optionsMenuContainer: { position: 'absolute', top: 80, right: 20, borderRadius: 12, paddingVertical: 8, minWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  optionText: { fontSize: 15 },
  optionDivider: { height: 1, marginVertical: 4 },
  reportModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reportModalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  reportModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  reportModalTitle: { fontSize: 18, fontWeight: '600' },
  reportLabel: { fontSize: 14, marginBottom: 8 },
  reportReasonItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8, gap: 12 },
  reportReasonText: { fontSize: 15 },
  reportInput: { borderRadius: 12, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  reportSubmitButton: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  reportSubmitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
