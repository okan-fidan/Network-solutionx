import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/services/api';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useFocusEffect } from '@react-navigation/native';

type TabType = 'all' | 'private' | 'service' | 'groups';

interface Conversation {
  id: string;
  type: 'private' | 'service';
  otherUser: {
    uid: string;
    name: string;
    profileImageUrl?: string;
    isOnline?: boolean;
  };
  service?: {
    id: string;
    title: string;
    category: string;
  };
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

interface GroupChat {
  id: string;
  name: string;
  communityId: string;
  communityName: string;
  memberCount: number;
  lastMessage?: string;
  lastMessageTime?: string;
  imageUrl?: string;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { userProfile, user } = useAuth();
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      // Özel mesajları yükle
      const conversationsRes = await api.get('/api/conversations');
      setConversations(conversationsRes.data || []);

      // Grup sohbetlerini yükle
      const communitiesRes = await api.get('/api/communities');
      const myGroups: GroupChat[] = [];
      
      for (const community of communitiesRes.data.filter((c: any) => c.isMember)) {
        try {
          const communityDetails = await api.get(`/api/communities/${community.id}`);
          const subgroups = communityDetails.data.subGroupsList || [];
          for (const sg of subgroups) {
            if (sg.isMember) {
              myGroups.push({
                id: sg.id,
                name: sg.name.replace(`${community.name} - `, ''),
                communityId: community.id,
                communityName: community.name,
                memberCount: sg.memberCount || 0,
                lastMessage: sg.lastMessage,
                lastMessageTime: sg.lastMessageTime,
                imageUrl: sg.imageUrl,
              });
            }
          }
        } catch (e) {
          // Sessizce devam et
        }
      }
      setGroupChats(myGroups);
    } catch (error: any) {
      console.log('Error loading messages:', error?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      } else if (diffDays === 1) {
        return 'Dün';
      } else if (diffDays < 7) {
        return date.toLocaleDateString('tr-TR', { weekday: 'short' });
      } else {
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      }
    } catch {
      return '';
    }
  };

  const tabs = [
    { key: 'all' as TabType, label: 'Tümü', icon: 'chatbubbles' },
    { key: 'private' as TabType, label: 'Özel Mesajlar', icon: 'person' },
    { key: 'service' as TabType, label: 'İşbirliği', icon: 'briefcase' },
    { key: 'groups' as TabType, label: 'Gruplar', icon: 'people' },
  ];

  const filteredConversations = conversations.filter(conv => {
    if (activeTab === 'private') return conv.type === 'private';
    if (activeTab === 'service') return conv.type === 'service';
    return true;
  });

  const filteredGroups = activeTab === 'private' || activeTab === 'service' ? [] : groupChats;

  const allItems = activeTab === 'groups' 
    ? [] 
    : [...filteredConversations].sort((a, b) => 
        new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
      );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${item.id}?type=dm`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.otherUser.profileImageUrl ? (
          <Image source={{ uri: item.otherUser.profileImageUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={item.type === 'service' ? ['#f59e0b', '#f97316'] : ['#6366f1', '#8b5cf6']}
            style={styles.avatarGradient}
          >
            <Text style={styles.avatarText}>
              {item.otherUser.name?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </LinearGradient>
        )}
        {item.otherUser.isOnline && <View style={styles.onlineIndicator} />}
        {item.type === 'service' && (
          <View style={styles.serviceIndicator}>
            <Ionicons name="briefcase" size={10} color="#fff" />
          </View>
        )}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>
            {item.otherUser.name}
          </Text>
          <Text style={styles.chatTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        
        {item.type === 'service' && item.service && (
          <Text style={styles.serviceLabel} numberOfLines={1}>
            🏷️ {item.service.title}
          </Text>
        )}
        
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'Henüz mesaj yok'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderGroupChat = ({ item }: { item: GroupChat }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/group/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
        ) : (
          <LinearGradient
            colors={['#10b981', '#14b8a6']}
            style={styles.avatarGradient}
          >
            <Ionicons name="people" size={22} color="#fff" />
          </LinearGradient>
        )}
      </View>

      <View style={styles.chatContent}>
        <View style={styles.chatHeader}>
          <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.chatTime}>
            {formatTime(item.lastMessageTime || '')}
          </Text>
        </View>
        <Text style={styles.communityLabel} numberOfLines={1}>
          {item.communityName}
        </Text>
        <View style={styles.chatFooter}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || `${item.memberCount} üye`}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={['#f3f4f6', '#e5e7eb']}
        style={styles.emptyIcon}
      >
        <Ionicons 
          name={activeTab === 'service' ? 'briefcase-outline' : activeTab === 'groups' ? 'people-outline' : 'chatbubbles-outline'} 
          size={48} 
          color="#9ca3af" 
        />
      </LinearGradient>
      <Text style={styles.emptyTitle}>
        {activeTab === 'private' && 'Henüz özel mesajınız yok'}
        {activeTab === 'service' && 'Henüz işbirliği mesajınız yok'}
        {activeTab === 'groups' && 'Henüz bir gruba katılmadınız'}
        {activeTab === 'all' && 'Henüz mesajınız yok'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'private' && 'Kullanıcı profillerinden mesaj gönderebilirsiniz'}
        {activeTab === 'service' && 'Hizmetler bölümünden iletişime geçebilirsiniz'}
        {activeTab === 'groups' && 'Topluluklardan gruplara katılabilirsiniz'}
        {activeTab === 'all' && 'Yeni sohbet başlatın'}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => {
          if (activeTab === 'groups') {
            router.push('/communities');
          } else if (activeTab === 'service') {
            router.push('/services');
          } else {
            router.push('/chat/new');
          }
        }}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.emptyButtonText}>
          {activeTab === 'groups' ? 'Toplulukları Keşfet' : activeTab === 'service' ? 'Hizmetlere Göz At' : 'Yeni Sohbet'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPrompt}>
          <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
          <Text style={styles.loginTitle}>Mesajlarınızı görün</Text>
          <Text style={styles.loginSubtitle}>Mesajlaşmak için giriş yapın</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={24} color="#1f2937" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/chat/new')}
          >
            <Ionicons name="create-outline" size={24} color="#1f2937" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'private' 
            ? conversations.filter(c => c.type === 'private').length
            : tab.key === 'service'
              ? conversations.filter(c => c.type === 'service').length
              : tab.key === 'groups'
                ? groupChats.length
                : conversations.length + groupChats.length;
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon as any} 
                size={18} 
                color={isActive ? '#6366f1' : '#6b7280'} 
              />
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <>
          {/* Conversations */}
          {(activeTab === 'all' || activeTab === 'private' || activeTab === 'service') && (
            <FlatList
              data={allItems}
              keyExtractor={(item) => item.id}
              renderItem={renderConversation}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
              }
              ListEmptyComponent={activeTab !== 'groups' ? renderEmptyState : null}
              ListFooterComponent={
                activeTab === 'all' && filteredGroups.length > 0 ? (
                  <View>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="people" size={18} color="#6b7280" />
                      <Text style={styles.sectionTitle}>Grup Sohbetleri</Text>
                    </View>
                    {filteredGroups.map((group) => (
                      <View key={group.id}>
                        {renderGroupChat({ item: group })}
                      </View>
                    ))}
                  </View>
                ) : null
              }
              contentContainerStyle={styles.listContent}
            />
          )}

          {/* Groups Only */}
          {activeTab === 'groups' && (
            <FlatList
              data={filteredGroups}
              keyExtractor={(item) => item.id}
              renderItem={renderGroupChat}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#6366f1']} />
              }
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 4,
  },
  tabActive: {
    backgroundColor: '#eef2ff',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: '#6366f1',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10b981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  serviceIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  chatContent: {
    flex: 1,
    justifyContent: 'center',
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  serviceLabel: {
    fontSize: 12,
    color: '#f59e0b',
    marginBottom: 2,
  },
  communityLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
