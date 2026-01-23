import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityApi } from '../../src/services/api';
import api from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

interface Community {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  isMember: boolean;
}

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  city?: string;
  isOnline: boolean;
  attendeeCount: number;
  isAttending: boolean;
  isFull: boolean;
  maxAttendees?: number;
  attendees?: { uid: string; name: string; profileImageUrl?: string }[];
}

type TabType = 'communities' | 'events';
type FilterType = 'all' | 'joined';

export default function CommunitiesScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('communities');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const router = useRouter();
  const { colors } = useTheme();

  const loadCommunities = useCallback(async () => {
    try {
      const response = await communityApi.getAll();
      setCommunities(response.data);
    } catch (error) {
      console.error('Error loading communities:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const response = await api.get('/api/events/upcoming');
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCommunities();
    loadEvents();
  }, [loadCommunities, loadEvents]);

  useEffect(() => {
    let filtered = [...communities];
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeFilter === 'joined') {
      filtered = filtered.filter((c) => c.isMember);
    }
    filtered.sort((a, b) => b.memberCount - a.memberCount);
    setFilteredCommunities(filtered);
  }, [searchQuery, communities, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCommunities();
    loadEvents();
  }, [loadCommunities, loadEvents]);

  const handleJoinEvent = async (eventId: string) => {
    try {
      await api.post(`/api/events/${eventId}/join`);
      loadEvents();
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.toLocaleDateString('tr-TR', { month: 'short' });
    return { day, month };
  };

  const joinedCount = communities.filter((c) => c.isMember).length;

  const renderCommunity = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={[styles.communityCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/community/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Topluluk Resmi */}
      {item.imageUrl ? (
        <Image 
          source={{ uri: item.imageUrl }} 
          style={styles.communityImage}
        />
      ) : (
        <View style={[styles.communityIcon, { backgroundColor: item.isMember ? '#10b98120' : colors.primary + '20' }]}>
          <Ionicons name="people" size={24} color={item.isMember ? '#10b981' : colors.primary} />
        </View>
      )}
      <View style={styles.communityInfo}>
        <Text style={[styles.communityName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
        <View style={styles.communityMeta}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.city}</Text>
          <Text style={[styles.metaDot, { color: colors.textSecondary }]}>•</Text>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.memberCount}</Text>
        </View>
      </View>
      <View style={styles.communityStatus}>
        {item.isMember ? (
          <View style={styles.memberBadge}>
            <Ionicons name="checkmark" size={16} color="#10b981" />
            <Text style={styles.memberText}>Üye</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderEvent = ({ item }: { item: Event }) => {
    const { day, month } = formatDate(item.date);
    const attendees = item.attendees || [];
    const displayAttendees = attendees.slice(0, 5);
    const extraCount = attendees.length > 5 ? attendees.length - 5 : 0;
    
    return (
      <TouchableOpacity
        style={styles.eventCard}
        activeOpacity={0.8}
      >
        <View style={styles.eventDateBox}>
          <Text style={styles.eventDay}>{day}</Text>
          <Text style={styles.eventMonth}>{month}</Text>
        </View>
        <View style={styles.eventContent}>
          <View style={styles.eventBadgeRow}>
            <View style={[styles.eventTypeBadge, item.isOnline ? styles.onlineBadge : styles.offlineBadge]}>
              <Ionicons name={item.isOnline ? 'videocam' : 'location'} size={12} color="#fff" />
              <Text style={styles.eventTypeBadgeText}>{item.isOnline ? 'Online' : 'Yüz Yüze'}</Text>
            </View>
          </View>
          <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
          <View style={styles.eventMeta}>
            <Ionicons name="time-outline" size={14} color="#6b7280" />
            <Text style={styles.eventMetaText}>{item.time}</Text>
            <Text style={styles.eventMetaDot}>•</Text>
            <Ionicons name="location-outline" size={14} color="#6b7280" />
            <Text style={styles.eventMetaText} numberOfLines={1}>{item.city || item.location}</Text>
          </View>
          
          {/* Katılımcı Avatarları */}
          <View style={styles.eventAttendeesSection}>
            <View style={styles.attendeeAvatars}>
              {displayAttendees.map((attendee, index) => (
                <View key={attendee.uid} style={[styles.attendeeAvatar, { marginLeft: index > 0 ? -10 : 0, zIndex: 5 - index }]}>
                  {attendee.profileImageUrl ? (
                    <Image source={{ uri: attendee.profileImageUrl }} style={styles.attendeeAvatarImage} />
                  ) : (
                    <View style={styles.attendeeAvatarPlaceholder}>
                      <Text style={styles.attendeeAvatarInitial}>{attendee.name?.charAt(0)?.toUpperCase() || '?'}</Text>
                    </View>
                  )}
                </View>
              ))}
              {extraCount > 0 && (
                <View style={[styles.attendeeAvatar, styles.attendeeAvatarExtra, { marginLeft: -10 }]}>
                  <Text style={styles.attendeeExtraText}>+{extraCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.attendeeCountText}>
              {item.attendeeCount} kişi katılıyor
              {item.maxAttendees && ` (${item.maxAttendees} kontenjan)`}
            </Text>
          </View>
          
          <View style={styles.eventFooter}>
            {item.isAttending ? (
              <View style={styles.attendingBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                <Text style={styles.attendingText}>Katılıyorsun</Text>
              </View>
            ) : item.isFull ? (
              <View style={styles.fullBadge}>
                <Text style={styles.fullText}>Dolu</Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.joinEventButton}
                onPress={() => handleJoinEvent(item.id)}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.joinEventText}>Katıl</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {activeTab === 'communities' ? 'Topluluklar' : 'Etkinlikler'}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {activeTab === 'communities' 
            ? `${communities.length} topluluk` 
            : `${events.length} yaklaşan etkinlik`}
        </Text>
      </View>

      {/* Tab Seçici */}
      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'communities' && styles.tabButtonActive]}
          onPress={() => setActiveTab('communities')}
        >
          <Ionicons 
            name="people" 
            size={20} 
            color={activeTab === 'communities' ? '#fff' : '#6b7280'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'communities' && styles.tabButtonTextActive]}>
            Topluluklar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'events' && styles.tabButtonActive]}
          onPress={() => setActiveTab('events')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'events' ? '#fff' : '#6b7280'} 
          />
          <Text style={[styles.tabButtonText, activeTab === 'events' && styles.tabButtonTextActive]}>
            Etkinlikler
          </Text>
          {events.length > 0 && (
            <View style={styles.eventCountBadge}>
              <Text style={styles.eventCountText}>{events.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeTab === 'communities' ? (
        <>
          {/* Arama */}
          <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Topluluk veya şehir ara..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filtreler */}
          <View style={styles.filtersContainer}>
            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'all' && [styles.filterTabActive, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveFilter('all')}
            >
              <Ionicons name="globe-outline" size={18} color={activeFilter === 'all' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.filterText, { color: activeFilter === 'all' ? colors.primary : colors.textSecondary }]}>Tümü</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, activeFilter === 'joined' && [styles.filterTabActive, { borderBottomColor: colors.primary }]]}
              onPress={() => setActiveFilter('joined')}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color={activeFilter === 'joined' ? colors.primary : colors.textSecondary} />
              <Text style={[styles.filterText, { color: activeFilter === 'joined' ? colors.primary : colors.textSecondary }]}>Üyeliklerim ({joinedCount})</Text>
            </TouchableOpacity>
          </View>

          {/* Topluluk Listesi */}
          <FlatList
            data={filteredCommunities}
            renderItem={renderCommunity}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  {activeFilter === 'joined' ? 'Henüz bir topluluğa üye değilsiniz' : 'Sonuç bulunamadı'}
                </Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
      ) : (
        <>
          {/* Etkinlik Listesi */}
          {eventsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={events}
              renderItem={renderEvent}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.eventListContent}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="calendar-outline" size={64} color="#374151" />
                  <Text style={[styles.emptyText, { color: colors.text }]}>Yaklaşan etkinlik yok</Text>
                  <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                    Yeni etkinlikler eklendiğinde burada görünecek
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 28, fontWeight: '700' },
  headerSubtitle: { fontSize: 14, marginTop: 4 },
  
  // Tab Selector
  tabSelector: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, backgroundColor: '#1f2937', borderRadius: 12, padding: 4 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  tabButtonActive: { backgroundColor: '#6366f1' },
  tabButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  tabButtonTextActive: { color: '#fff' },
  eventCountBadge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 4 },
  eventCountText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  
  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 12 },
  searchInput: { flex: 1, fontSize: 16 },
  
  // Filters
  filtersContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 12, gap: 16 },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 6 },
  filterTabActive: { borderBottomWidth: 2 },
  filterText: { fontSize: 14, fontWeight: '500' },
  
  // List
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },
  separator: { height: 12 },
  
  // Community Card
  communityCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16 },
  communityIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  communityInfo: { flex: 1, marginLeft: 14 },
  communityName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  communityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13 },
  metaDot: { fontSize: 8 },
  communityStatus: { marginLeft: 12 },
  memberBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b98120', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  memberText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  
  // Event List
  eventListContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 },
  
  // Event Card
  eventCard: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  eventDateBox: { width: 70, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', paddingVertical: 16 },
  eventDay: { color: '#fff', fontSize: 28, fontWeight: '700' },
  eventMonth: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  eventContent: { flex: 1, padding: 14 },
  eventBadgeRow: { flexDirection: 'row', marginBottom: 8 },
  eventTypeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, gap: 4 },
  onlineBadge: { backgroundColor: '#8b5cf6' },
  offlineBadge: { backgroundColor: '#10b981' },
  eventTypeBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  eventTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8, lineHeight: 22 },
  eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  eventMetaText: { color: '#6b7280', fontSize: 12, flex: 0 },
  eventMetaDot: { color: '#6b7280', fontSize: 8, marginHorizontal: 2 },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attendeesInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeesText: { color: '#6b7280', fontSize: 12 },
  attendingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 4 },
  attendingText: { color: '#10b981', fontSize: 12, fontWeight: '600' },
  fullBadge: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  fullText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  joinEventButton: { flexDirection: 'row', backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, alignItems: 'center', gap: 6 },
  joinEventText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  // Katılımcı Avatarları
  eventAttendeesSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1f2937' },
  attendeeAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  attendeeAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#111827', overflow: 'hidden' },
  attendeeAvatarImage: { width: '100%', height: '100%' },
  attendeeAvatarPlaceholder: { width: '100%', height: '100%', backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  attendeeAvatarInitial: { color: '#fff', fontSize: 12, fontWeight: '700' },
  attendeeAvatarExtra: { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  attendeeExtraText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  attendeeCountText: { color: '#9ca3af', fontSize: 12 },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyText: { fontSize: 17, fontWeight: '600', marginTop: 16, textAlign: 'center' },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
});
