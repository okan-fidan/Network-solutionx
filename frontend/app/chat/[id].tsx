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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { conversationApi, userListApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { formatDistanceToNow, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderImage?: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'video' | 'file' | 'deleted';
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
  deletedFor?: string[];
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

const EMOJI_LIST = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const { userProfile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const menuAnimation = useRef(new Animated.Value(0)).current;

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
      const res = await conversationApi.getMessages(conversationId);
      const formattedMessages = (res.data || [])
        .filter((msg: any) => {
          // Silinen mesajları filtrele (sadece benim için silinenler)
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
        }));
      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  // İlk yükleme
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
      }, 2000);
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

  // Menüyü kapat
  const closeMenu = () => {
    Animated.timing(menuAnimation, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowMessageMenu(false);
      setShowEmojiPicker(false);
      setSelectedMessage(null);
    });
  };

  // Emoji reaksiyon
  const handleReaction = async (emoji: string) => {
    if (!selectedMessage || !conversation) return;

    try {
      await conversationApi.reactToMessage(conversation.id, selectedMessage.id, emoji);
      
      // Lokal güncelleme
      setMessages(prev => prev.map(msg => {
        if (msg.id === selectedMessage.id) {
          const reactions = { ...msg.reactions };
          const userId = user?.uid || '';
          
          // Mevcut reaksiyonu kontrol et
          Object.keys(reactions).forEach(em => {
            if (reactions[em]?.includes(userId)) {
              reactions[em] = reactions[em].filter(id => id !== userId);
              if (reactions[em].length === 0) delete reactions[em];
            }
          });
          
          // Yeni reaksiyon ekle
          if (!reactions[emoji]) reactions[emoji] = [];
          if (!reactions[emoji].includes(userId)) {
            reactions[emoji].push(userId);
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));
      
      closeMenu();
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Mesaj silme
  const handleDelete = async (deleteForAll: boolean) => {
    if (!selectedMessage || !conversation) return;

    Alert.alert(
      'Mesajı Sil',
      deleteForAll 
        ? 'Bu mesaj herkes için silinecek. Emin misiniz?' 
        : 'Bu mesaj sadece sizin için silinecek.',
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
              console.error('Error deleting message:', error);
              Alert.alert('Hata', 'Mesaj silinemedi.');
            }
          }
        }
      ]
    );
  };

  // Yanıtlama modu
  const handleReply = () => {
    if (!selectedMessage) return;
    setReplyingTo(selectedMessage);
    closeMenu();
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
          <View style={styles.avatarContainer}>
            {item.senderImage ? (
              <Image source={{ uri: item.senderImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                <Ionicons name="person" size={14} color={colors.textSecondary} />
              </View>
            )}
          </View>
        )}
        {!isMe && !showAvatar && <View style={styles.avatarSpacer} />}
        
        <View style={{ maxWidth: '75%' }}>
          {/* Yanıtlanan mesaj */}
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

          {/* Mesaj balonu */}
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
            ) : (
              <>
                {item.type === 'image' && item.mediaUrl && (
                  <Image source={{ uri: item.mediaUrl }} style={styles.messageImage} />
                )}
                <Text style={[
                  styles.messageText,
                  { color: isMe ? '#fff' : colors.text }
                ]}>
                  {item.content}
                </Text>
                <View style={styles.messageFooter}>
                  {item.edited && (
                    <Text style={[styles.editedLabel, { color: isMe ? 'rgba(255,255,255,0.6)' : colors.textSecondary }]}>
                      düzenlendi
                    </Text>
                  )}
                  <Text style={[
                    styles.messageTime,
                    { color: isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary }
                  ]}>
                    {format(item.timestamp, 'HH:mm')}
                  </Text>
                  {isMe && (
                    <Ionicons 
                      name={item.read ? 'checkmark-done' : 'checkmark'} 
                      size={14} 
                      color={isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary} 
                      style={{ marginLeft: 2 }}
                    />
                  )}
                </View>
              </>
            )}
          </View>

          {/* Reaksiyonlar */}
          {hasReactions && (
            <View style={[styles.reactionsContainer, isMe && styles.reactionsContainerMe]}>
              {Object.entries(item.reactions || {}).map(([emoji, users]) => (
                <View key={emoji} style={[styles.reactionBubble, { backgroundColor: colors.card }]}>
                  <Text style={styles.reactionEmoji}>{emoji}</Text>
                  {users.length > 1 && (
                    <Text style={[styles.reactionCount, { color: colors.text }]}>{users.length}</Text>
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
          <Animated.View 
            style={[
              styles.menuContainer,
              { 
                backgroundColor: colors.card,
                transform: [{ scale: menuAnimation }],
                opacity: menuAnimation,
              }
            ]}
          >
            {/* Emoji picker */}
            <View style={styles.emojiRow}>
              {EMOJI_LIST.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiButton}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

            {/* Menü seçenekleri */}
            <TouchableOpacity style={styles.menuItem} onPress={handleReply}>
              <Ionicons name="return-up-back" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Yanıtla</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                // Kopyala
                closeMenu();
              }}
            >
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
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Henüz mesaj yok
              </Text>
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
    marginBottom: 4,
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
    width: 28,
    marginRight: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  replyPreview: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 4,
    overflow: 'hidden',
  },
  replyBar: {
    width: 3,
  },
  replyContent: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  replyName: {
    fontSize: 12,
    fontWeight: '600',
  },
  replyText: {
    fontSize: 12,
    marginTop: 2,
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60,
  },
  messageBubbleMe: {
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    borderBottomLeftRadius: 4,
  },
  deletedBubble: {
    opacity: 0.7,
  },
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  messageTime: {
    fontSize: 11,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsContainerMe: {
    justifyContent: 'flex-end',
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 11,
    marginLeft: 2,
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
  replyBar2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  replyBarLine: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  replyBarContent: {
    flex: 1,
    marginLeft: 8,
  },
  replyBarTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  replyBarText: {
    fontSize: 13,
    marginTop: 2,
  },
  replyBarClose: {
    padding: 8,
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
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: SCREEN_WIDTH * 0.8,
    maxWidth: 300,
    borderRadius: 16,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  emojiButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
  menuDivider: {
    height: 1,
    marginVertical: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuText: {
    fontSize: 15,
  },
});
