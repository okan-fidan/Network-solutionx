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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { conversationApi, userListApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file';
  mediaUrl?: string;
  read: boolean;
}

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  city?: string;
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

export default function PrivateChatScreen() {
  const { id: otherUserId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { userProfile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Konuşmayı başlat veya mevcut olanı bul
  const initConversation = useCallback(async () => {
    if (!otherUserId || !user) return;

    try {
      // Önce diğer kullanıcı bilgilerini al
      const userRes = await userListApi.getOne(otherUserId);
      setOtherUser(userRes.data);

      // Konuşmayı başlat veya mevcut olanı al
      const convRes = await conversationApi.start({ 
        otherUserId, 
        type: 'private' 
      });
      setConversation(convRes.data);
      
      // Mesajları yükle
      await loadMessages(convRes.data.id);
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
      setLoadingMessages(true);
      const res = await conversationApi.getMessages(conversationId);
      const formattedMessages = (res.data || []).map((msg: any) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        senderImage: msg.senderImage,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        type: msg.type || 'text',
        mediaUrl: msg.mediaUrl,
        read: msg.read,
      }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Mesajları periyodik olarak güncelle
  useEffect(() => {
    initConversation();

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [initConversation]);

  // Polling ile mesajları güncelle
  useEffect(() => {
    if (conversation?.id) {
      pollingRef.current = setInterval(() => {
        loadMessages(conversation.id);
      }, 3000); // Her 3 saniyede bir güncelle
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [conversation?.id]);

  // Mesaj gönder
  const handleSend = async () => {
    if (!inputText.trim() || !conversation?.id || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const res = await conversationApi.sendMessage(conversation.id, {
        content: messageText,
        type: 'text',
      });

      // Yeni mesajı listeye ekle
      const newMessage: Message = {
        id: res.data.id,
        senderId: user?.uid || '',
        senderName: `${userProfile?.firstName || ''} ${userProfile?.lastName || ''}`.trim(),
        senderImage: userProfile?.profileImageUrl,
        content: messageText,
        timestamp: new Date(),
        type: 'text',
        read: false,
      };

      setMessages(prev => [...prev, newMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      setInputText(messageText); // Mesajı geri koy
    } finally {
      setSending(false);
    }
  };

  // Mesaj render
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === user?.uid;
    const showAvatar = !isMe && (index === 0 || messages[index - 1]?.senderId !== item.senderId);

    return (
      <View style={[
        styles.messageRow,
        isMe ? styles.messageRowMe : styles.messageRowOther
      ]}>
        {!isMe && showAvatar && (
          <View style={styles.avatarContainer}>
            {item.senderImage ? (
              <Image source={{ uri: item.senderImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                <Ionicons name="person" size={16} color={colors.textSecondary} />
              </View>
            )}
          </View>
        )}
        {!isMe && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={[
          styles.messageBubble,
          isMe ? [styles.messageBubbleMe, { backgroundColor: colors.primary }] : 
                 [styles.messageBubbleOther, { backgroundColor: colors.card }]
        ]}>
          {item.type === 'image' && item.mediaUrl && (
            <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
          )}
          {item.content && (
            <Text style={[
              styles.messageText,
              { color: isMe ? '#fff' : colors.text }
            ]}>
              {item.content}
            </Text>
          )}
          <Text style={[
            styles.messageTime,
            { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
          ]}>
            {formatDistanceToNow(item.timestamp, { addSuffix: true, locale: tr })}
          </Text>
        </View>
      </View>
    );
  };

  // Header
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerProfile} activeOpacity={0.7}>
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
              {otherUser.city}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.headerAction}>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  // Input bar
  const renderInputBar = () => (
    <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
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
          <Ionicons name="send" size={20} color="#fff" />
        )}
      </Pressable>
    </View>
  );

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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Henüz mesaj yok
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Sohbete başlamak için bir mesaj gönderin
              </Text>
            </View>
          }
        />

        {renderInputBar()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerProfile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  headerAction: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  avatarContainer: {
    marginRight: 8,
  },
  avatarSpacer: {
    width: 32,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 120,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
