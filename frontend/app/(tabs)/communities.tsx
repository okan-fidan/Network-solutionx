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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityApi } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';

interface Community {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  isMember: boolean;
}

type FilterType = 'all' | 'joined';

export default function CommunitiesScreen() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const router = useRouter();
  const { colors, isDark } = useTheme();

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

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  useEffect(() => {
    let filtered = [...communities];

    // Arama filtresi
    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Üyelik filtresi
    if (activeFilter === 'joined') {
      filtered = filtered.filter((c) => c.isMember);
    }

    // Üye sayısına göre sırala
    filtered.sort((a, b) => b.memberCount - a.memberCount);

    setFilteredCommunities(filtered);
  }, [searchQuery, communities, activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCommunities();
  }, [loadCommunities]);

  const joinedCount = communities.filter((c) => c.isMember).length;

  const renderCommunity = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={[styles.communityCard, { backgroundColor: colors.card }]}
      onPress={() => router.push(`/community/${item.id}`)}
      activeOpacity={0.7}
    >
      {/* Sol: Icon */}
      <View style={[
        styles.communityIcon, 
        { backgroundColor: item.isMember ? '#10b98120' : colors.primary + '20' }
      ]}>
        <Ionicons 
          name="people" 
          size={24} 
          color={item.isMember ? '#10b981' : colors.primary} 
        />
      </View>

      {/* Orta: Bilgiler */}
      <View style={styles.communityInfo}>
        <Text style={[styles.communityName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.communityMeta}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.city}</Text>
          <Text style={[styles.metaDot, { color: colors.textSecondary }]}>•</Text>
          <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>{item.memberCount}</Text>
        </View>
      </View>

      {/* Sağ: Durum */}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Topluluklar</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {communities.length} topluluk
        </Text>
      </View>

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
          style={[
            styles.filterTab, 
            activeFilter === 'all' && [styles.filterTabActive, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setActiveFilter('all')}
        >
          <Ionicons 
            name="globe-outline" 
            size={18} 
            color={activeFilter === 'all' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.filterText, 
            { color: activeFilter === 'all' ? colors.primary : colors.textSecondary }
          ]}>
            Tümü
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab, 
            activeFilter === 'joined' && [styles.filterTabActive, { borderBottomColor: colors.primary }]
          ]}
          onPress={() => setActiveFilter('joined')}
        >
          <Ionicons 
            name="checkmark-circle-outline" 
            size={18} 
            color={activeFilter === 'joined' ? colors.primary : colors.textSecondary} 
          />
          <Text style={[
            styles.filterText, 
            { color: activeFilter === 'joined' ? colors.primary : colors.textSecondary }
          ]}>
            Üyeliklerim ({joinedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      <FlatList
        data={filteredCommunities}
        renderItem={renderCommunity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.text }]}>
              {activeFilter === 'joined' ? 'Henüz bir topluluğa üye değilsiniz' : 'Sonuç bulunamadı'}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              {activeFilter === 'joined' ? 'Topluluklara göz atarak üye olabilirsiniz' : 'Farklı bir arama deneyin'}
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 24,
    marginBottom: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomWidth: 2,
  },
  filterText: {
    fontSize: 15,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  separator: {
    height: 8,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
  },
  communityIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
    marginLeft: 14,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
  },
  communityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  metaDot: {
    marginHorizontal: 4,
  },
  communityStatus: {
    marginLeft: 8,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b98115',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  memberText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
});
