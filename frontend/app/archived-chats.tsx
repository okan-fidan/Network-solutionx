/**
 * Arşivlenmiş Sohbetler Sayfası
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useChatSettings } from '../src/contexts/ChatSettingsContext';

export default function ArchivedChatsScreen() {
  const router = useRouter();
  const { chatSettings, archiveChat } = useChatSettings();
  const [archivedChats, setArchivedChats] = useState<any[]>([]);

  // Arşivlenmiş sohbetleri yükle
  useEffect(() => {
    // Burada Firebase'den arşivlenmiş sohbet detaylarını çekebilirsiniz
    // Şimdilik boş liste gösteriyoruz
  }, [chatSettings.archivedChats]);

  const handleUnarchive = async (chatId: string) => {
    await archiveChat(chatId, false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Arşivlenmiş Sohbetler</Text>
        <View style={{ width: 40 }} />
      </View>

      {chatSettings.archivedChats.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="archive-outline" size={64} color="#6366f1" />
          </View>
          <Text style={styles.emptyText}>Arşivlenmiş sohbet yok</Text>
          <Text style={styles.emptySubtext}>
            Sohbetleri arşivlemek için sohbet listesinde sola kaydırın
          </Text>
        </View>
      ) : (
        <FlatList
          data={archivedChats}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.chatItem}
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View style={styles.avatar}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.avatarImage} />
                ) : (
                  <Ionicons name="person" size={24} color="#9ca3af" />
                )}
              </View>
              <View style={styles.chatInfo}>
                <Text style={styles.chatName}>{item.name}</Text>
                <Text style={styles.chatMessage}>{item.lastMessage}</Text>
              </View>
              <TouchableOpacity
                style={styles.unarchiveButton}
                onPress={() => handleUnarchive(item.id)}
              >
                <Ionicons name="arrow-up-circle" size={24} color="#6366f1" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  chatMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  unarchiveButton: {
    padding: 8,
  },
});
