import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import api from '../../src/services/api';
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
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const { userProfile, user } = useAuth();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      setInitialLoadDone(true);
      return;
    }

    if (!initialLoadDone && !forceRefresh) {
      setLoading(true);
    }

    try {
      // Timeout ile API çağrıları
      const timeoutPromise = (promise: Promise<any>, ms: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
      };

      // Paralel olarak verileri yükle (5 saniye timeout)
      const [conversationsRes, communitiesRes] = await Promise.all([
        timeoutPromise(api.get('/api/conversations'), 5000).catch(() => ({ data: [] })),
        timeoutPromise(api.get('/api/communities'), 5000).catch(() => ({ data: [] })),
      ]);

      setConversations(conversationsRes.data || []);

      // Grup sohbetlerini yükle - sadece üye olunan topluluklar
      const memberCommunities = (communitiesRes.data || []).filter((c: any) => c.isMember);
      
      if (memberCommunities.length === 0) {
        setGroupChats([]);
        return;
      }

      // Tüm topluluk detaylarını paralel olarak çek (max 5 tane, 3 saniye timeout)
      const communityPromises = memberCommunities.slice(0, 5).map((community: any) =>
        timeoutPromise(api.get(`/api/communities/${community.id}`), 3000)
          .then(res => ({ community, details: res.data }))
          .catch(() => null)
      );

      const communityResults = await Promise.all(communityPromises);
      
      const myGroups: GroupChat[] = [];
      for (const result of communityResults) {
        if (!result) continue;
        const { community, details } = result;
        const subgroups = details.subGroupsList || [];
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
      }
      setGroupChats(myGroups);
    } catch (error: any) {
      console.log('Error loading messages:', error?.message);
      // Hata durumunda boş liste göster, yükleme durumunu kapat
      setConversations([]);
      setGroupChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setInitialLoadDone(true);
    }
  }, [user, initialLoadDone]);

  useFocusEffect(
    useCallback(() => {
      // Sayfa her fokuslandığında yeniden yükle - unread count için kritik
      loadData(true);
    }, [user])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(true);
  }, [user]);

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
    { key: 'all' as TabType, label: 'Tümü', icon: 'chatbubbles-outline' },
    { key: 'private' as TabType, label: 'Özel', icon: 'person-outline' },
    { key: 'service' as TabType, label: 'İşbirliği', icon: 'briefcase-outline' },
    { key: 'groups' as TabType, label: 'Gruplar', icon: 'people-outline' },
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

  const styles = createStyles(colors, isDark);

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() => router.push(`/chat/${item.otherUser.uid}`)}
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
          <Text style={[styles.chatTime, item.unreadCount > 0 && styles.chatTimeUnread]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        
        {item.type === 'service' && item.service && (
          <View style={styles.serviceBadge}>
            <Ionicons name="pricetag" size={10} color="#f59e0b" />
            <Text style={styles.serviceLabel} numberOfLines={1}>
              {item.service.title}
            </Text>
          </View>
        )}
        
        <View style={styles.chatFooter}>
          <Text style={[styles.lastMessage, item.unreadCount > 0 && styles.lastMessageUnread]} numberOfLines={1}>
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
            colors={['#10b981', '#059669']}
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
        <View style={styles.communityBadge}>
          <Ionicons name="globe-outline" size={10} color={colors.textTertiary} />
          <Text style={styles.communityLabel} numberOfLines={1}>
            {item.communityName}
          </Text>
        </View>
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
      <View style={styles.emptyIconContainer}>
        <LinearGradient
          colors={isDark ? ['#1f2937', '#374151'] : ['#f3f4f6', '#e5e7eb']}
          style={styles.emptyIcon}
        >
          <Ionicons 
            name={
              activeTab === 'service' ? 'briefcase-outline' : 
              activeTab === 'groups' ? 'people-outline' : 
              activeTab === 'private' ? 'person-outline' :
              'chatbubbles-outline'
            } 
            size={48} 
            color={colors.textTertiary} 
          />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>
        {activeTab === 'private' && 'Özel mesajınız yok'}
        {activeTab === 'service' && 'İşbirliği mesajı yok'}
        {activeTab === 'groups' && 'Gruba katılmadınız'}
        {activeTab === 'all' && 'Mesajınız yok'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeTab === 'private' && 'Kullanıcı profillerinden mesaj gönderin'}
        {activeTab === 'service' && 'Hizmetlerden iletişime geçin'}
        {activeTab === 'groups' && 'Topluluklardan gruplara katılın'}
        {activeTab === 'all' && 'Yeni bir sohbet başlatın'}
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
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButtonGradient}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.emptyButtonText}>
            {activeTab === 'groups' ? 'Toplulukları Keşfet' : activeTab === 'service' ? 'Hizmetlere Göz At' : 'Yeni Sohbet'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loginPrompt}>
          <LinearGradient
            colors={isDark ? ['#1f2937', '#374151'] : ['#f3f4f6', '#e5e7eb']}
            style={styles.loginIcon}
          >
            <Ionicons name="chatbubbles-outline" size={64} color={colors.textTertiary} />
          </LinearGradient>
          <Text style={styles.loginTitle}>Mesajlarınızı Görün</Text>
          <Text style={styles.loginSubtitle}>Mesajlaşmak için giriş yapın</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Giriş Yap</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mesajlar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={22} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonPrimary]}
            onPress={() => router.push('/chat/new')}
          >
            <Ionicons name="create-outline" size={22} color="#fff" />
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
              activeOpacity={0.7}
            >
              <Ionicons 
                name={isActive ? tab.icon.replace('-outline', '') as any : tab.icon as any} 
                size={18} 
                color={isActive ? colors.primary : colors.textTertiary} 
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
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
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
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={activeTab !== 'groups' ? renderEmptyState : null}
              ListFooterComponent={
                activeTab === 'all' && filteredGroups.length > 0 ? (
                  <View>
                    <View style={styles.sectionHeader}>
                      <Ionicons name="people" size={16} color={colors.textTertiary} />
                      <Text style={styles.sectionTitle}>Grup Sohbetleri</Text>
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{filteredGroups.length}</Text>
                      </View>
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
              showsVerticalScrollIndicator={false}
            />
          )}

          {/* Groups Only */}
          {activeTab === 'groups' && (
            <FlatList
              data={filteredGroups}
              keyExtractor={(item) => item.id}
              renderItem={renderGroupChat}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={onRefresh} 
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonPrimary: {
    backgroundColor: colors.primary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 4,
  },
  tabActive: {
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: colors.primary,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  tabBadgeTextActive: {
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textTertiary,
  },
  listContent: {
    flexGrow: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  avatarGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
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
    borderColor: colors.background,
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
    borderColor: colors.background,
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
    color: colors.text,
    flex: 1,
  },
  chatTime: {
    fontSize: 12,
    color: colors.textTertiary,
    marginLeft: 8,
  },
  chatTimeUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  serviceLabel: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  communityLabel: {
    fontSize: 12,
    color: colors.textTertiary,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  lastMessageUnread: {
    color: colors.text,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 22,
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textTertiary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 64,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  loginIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  loginSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  loginButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  loginButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
