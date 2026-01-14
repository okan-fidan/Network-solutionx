/**
 * Mesaj İletme Modal
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

interface Chat {
  id: string;
  name: string;
  type: 'dm' | 'group';
  imageUrl?: string;
}

interface ForwardMessageModalProps {
  visible: boolean;
  onClose: () => void;
  onForward: (chatIds: string[]) => void;
  messageContent: string;
}

export default function ForwardMessageModal({
  visible,
  onClose,
  onForward,
  messageContent,
}: ForwardMessageModalProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChats, setSelectedChats] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadChats();
    }
  }, [visible]);

  const loadChats = async () => {
    setLoading(true);
    try {
      // Kullanıcıları ve grupları yükle
      const [usersRes, communitiesRes] = await Promise.all([
        api.get('/api/users'),
        api.get('/api/communities'),
      ]);

      const userChats: Chat[] = (usersRes.data || []).slice(0, 20).map((u: any) => ({
        id: u.uid,
        name: `${u.firstName} ${u.lastName}`,
        type: 'dm' as const,
        imageUrl: u.profileImageUrl,
      }));

      const groupChats: Chat[] = [];
      for (const community of communitiesRes.data?.filter((c: any) => c.isMember) || []) {
        groupChats.push({
          id: community.id,
          name: community.name,
          type: 'group' as const,
          imageUrl: community.imageUrl,
        });
      }

      setChats([...groupChats, ...userChats]);
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleChat = (chatId: string) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleForward = () => {
    if (selectedChats.length > 0) {
      onForward(selectedChats);
      setSelectedChats([]);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mesajı İlet</Text>
          <TouchableOpacity
            onPress={handleForward}
            disabled={selectedChats.length === 0}
          >
            <Text style={[styles.sendText, selectedChats.length === 0 && styles.sendTextDisabled]}>
              Gönder ({selectedChats.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Message Preview */}
        <View style={styles.messagePreview}>
          <Ionicons name="chatbubble" size={16} color="#6366f1" />
          <Text style={styles.messagePreviewText} numberOfLines={2}>
            {messageContent}
          </Text>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Kişi veya grup ara..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Chat List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
          </View>
        ) : (
          <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selectedChats.includes(item.id);
              return (
                <TouchableOpacity
                  style={[styles.chatItem, isSelected && styles.chatItemSelected]}
                  onPress={() => toggleChat(item.id)}
                >
                  <View style={styles.chatAvatar}>
                    {item.imageUrl ? (
                      <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons
                        name={item.type === 'group' ? 'people' : 'person'}
                        size={24}
                        color="#9ca3af"
                      />
                    )}
                  </View>
                  <View style={styles.chatInfo}>
                    <Text style={styles.chatName}>{item.name}</Text>
                    <Text style={styles.chatType}>
                      {item.type === 'group' ? 'Grup' : 'Kişi'}
                    </Text>
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  sendText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  sendTextDisabled: {
    opacity: 0.5,
  },
  messagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  messagePreviewText: {
    flex: 1,
    color: '#9ca3af',
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  chatItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  chatType: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
