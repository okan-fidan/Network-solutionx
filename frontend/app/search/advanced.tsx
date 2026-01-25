import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { userListApi, generalApi } from '../../src/services/api';
import { useTheme } from '../../src/contexts/ThemeContext';
import debounce from 'lodash/debounce';

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  occupation?: string;
  city?: string;
  profileImageUrl?: string;
  bio?: string;
  skills?: string[];
  workExperience?: {
    title: string;
    company: string;
    current?: boolean;
  }[];
}

interface SearchFilters {
  q: string;
  occupation: string;
  city: string;
  skills: string;
  experience_title: string;
  experience_company: string;
  sort_by: string;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Alaka Düzeni' },
  { value: 'name', label: 'İsme Göre' },
  { value: 'recent', label: 'En Yeni' },
];

export default function AdvancedSearchScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [popularOccupations, setPopularOccupations] = useState<string[]>([]);
  const [popularSkills, setPopularSkills] = useState<string[]>([]);
  
  const [filters, setFilters] = useState<SearchFilters>({
    q: '',
    occupation: '',
    city: '',
    skills: '',
    experience_title: '',
    experience_company: '',
    sort_by: 'relevance',
  });
  
  const [tempFilters, setTempFilters] = useState<SearchFilters>(filters);
  
  const { colors, isDark } = useTheme();
  const router = useRouter();

  // İlk yükleme - şehirler ve öneriler
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [citiesRes, occupationsRes, skillsRes] = await Promise.all([
        generalApi.getCities(),
        userListApi.getPopularOccupations().catch(() => ({ data: [] })),
        userListApi.getPopularSkills().catch(() => ({ data: [] })),
      ]);
      
      setCities(citiesRes.data?.cities || []);
      setPopularOccupations(occupationsRes.data?.map((o: any) => o.occupation) || []);
      setPopularSkills(skillsRes.data?.map((s: any) => s.skill) || []);
      
      // İlk arama
      await searchUsers(filters, 0, true);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // Arama fonksiyonu
  const searchUsers = async (searchFilters: SearchFilters, skipCount: number = 0, reset: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const res = await userListApi.advancedSearch({
        ...searchFilters,
        skip: skipCount,
        limit: 20,
      });
      
      const newUsers = res.data?.users || [];
      
      if (reset) {
        setUsers(newUsers);
      } else {
        setUsers(prev => [...prev, ...newUsers]);
      }
      
      setTotal(res.data?.total || 0);
      setHasMore(res.data?.hasMore || false);
      setSkip(skipCount + newUsers.length);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced arama
  const debouncedSearch = useCallback(
    debounce((searchFilters: SearchFilters) => {
      searchUsers(searchFilters, 0, true);
    }, 500),
    []
  );

  // Genel arama değiştiğinde
  const handleSearchChange = (text: string) => {
    const newFilters = { ...filters, q: text };
    setFilters(newFilters);
    debouncedSearch(newFilters);
  };

  // Filtre uygula
  const applyFilters = () => {
    setFilters(tempFilters);
    setShowFilters(false);
    searchUsers(tempFilters, 0, true);
  };

  // Filtreleri temizle
  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      q: filters.q,
      occupation: '',
      city: '',
      skills: '',
      experience_title: '',
      experience_company: '',
      sort_by: 'relevance',
    };
    setTempFilters(clearedFilters);
  };

  // Daha fazla yükle
  const loadMore = () => {
    if (!loading && hasMore) {
      searchUsers(filters, skip, false);
    }
  };

  // Aktif filtre sayısı
  const activeFilterCount = [
    filters.occupation,
    filters.city,
    filters.skills,
    filters.experience_title,
    filters.experience_company,
  ].filter(f => f).length;

  // Kullanıcı kartı
  const renderUserCard = ({ item }: { item: User }) => {
    const currentJob = item.workExperience?.find(exp => exp.current);
    
    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.card }]}
        onPress={() => router.push(`/user/${item.uid}`)}
        activeOpacity={0.7}
      >
        <View style={styles.userCardContent}>
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.firstName?.[0]}{item.lastName?.[0]}
              </Text>
            </View>
          )}
          
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {item.firstName} {item.lastName}
            </Text>
            
            {item.occupation && (
              <Text style={[styles.userOccupation, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.occupation}
              </Text>
            )}
            
            {currentJob && (
              <View style={styles.currentJobRow}>
                <Ionicons name="briefcase-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.currentJobText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {currentJob.title} @ {currentJob.company}
                </Text>
              </View>
            )}
            
            {item.city && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.locationText, { color: colors.textSecondary }]}>
                  {item.city}
                </Text>
              </View>
            )}
            
            {item.skills && item.skills.length > 0 && (
              <View style={styles.skillsRow}>
                {item.skills.slice(0, 3).map((skill, index) => (
                  <View key={index} style={[styles.skillChip, { backgroundColor: colors.primary + '15' }]}>
                    <Text style={[styles.skillChipText, { color: colors.primary }]}>{skill}</Text>
                  </View>
                ))}
                {item.skills.length > 3 && (
                  <Text style={[styles.moreSkills, { color: colors.textSecondary }]}>
                    +{item.skills.length - 3}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>
    );
  };

  // Filtre modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilters}
      animationType="slide"
      transparent
      onRequestClose={() => setShowFilters(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.filterModal, { backgroundColor: colors.card }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filtreler</Text>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.filterContent} showsVerticalScrollIndicator={false}>
            {/* Meslek */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Meslek</Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Örn: Yazılım Geliştirici"
                placeholderTextColor={colors.textSecondary}
                value={tempFilters.occupation}
                onChangeText={(text) => setTempFilters({ ...tempFilters, occupation: text })}
              />
              {popularOccupations.length > 0 && (
                <View style={styles.suggestionsRow}>
                  {popularOccupations.slice(0, 5).map((occ, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionChip, { borderColor: colors.border }]}
                      onPress={() => setTempFilters({ ...tempFilters, occupation: occ })}
                    >
                      <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{occ}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {/* Şehir */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Şehir</Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Şehir seçin"
                placeholderTextColor={colors.textSecondary}
                value={tempFilters.city}
                onChangeText={(text) => setTempFilters({ ...tempFilters, city: text })}
              />
            </View>
            
            {/* Beceriler */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Beceriler</Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Virgülle ayırın: React, Node.js, Python"
                placeholderTextColor={colors.textSecondary}
                value={tempFilters.skills}
                onChangeText={(text) => setTempFilters({ ...tempFilters, skills: text })}
              />
              {popularSkills.length > 0 && (
                <View style={styles.suggestionsRow}>
                  {popularSkills.slice(0, 6).map((skill, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[styles.suggestionChip, { borderColor: colors.border }]}
                      onPress={() => {
                        const current = tempFilters.skills;
                        const newSkills = current ? `${current}, ${skill}` : skill;
                        setTempFilters({ ...tempFilters, skills: newSkills });
                      }}
                    >
                      <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{skill}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            {/* İş Deneyimi - Unvan */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>İş Unvanı</Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Örn: CEO, CTO, Manager"
                placeholderTextColor={colors.textSecondary}
                value={tempFilters.experience_title}
                onChangeText={(text) => setTempFilters({ ...tempFilters, experience_title: text })}
              />
            </View>
            
            {/* İş Deneyimi - Şirket */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Şirket</Text>
              <TextInput
                style={[styles.filterInput, { backgroundColor: colors.background, color: colors.text }]}
                placeholder="Şirket adı"
                placeholderTextColor={colors.textSecondary}
                value={tempFilters.experience_company}
                onChangeText={(text) => setTempFilters({ ...tempFilters, experience_company: text })}
              />
            </View>
            
            {/* Sıralama */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>Sıralama</Text>
              <View style={styles.sortOptions}>
                {SORT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.sortOption,
                      { borderColor: colors.border },
                      tempFilters.sort_by === option.value && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setTempFilters({ ...tempFilters, sort_by: option.value })}
                  >
                    <Text style={[
                      styles.sortOptionText,
                      { color: colors.text },
                      tempFilters.sort_by === option.value && { color: '#fff' }
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.filterActions}>
            <TouchableOpacity
              style={[styles.clearButton, { borderColor: colors.border }]}
              onPress={clearFilters}
            >
              <Text style={[styles.clearButtonText, { color: colors.text }]}>Temizle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Uygula</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Kullanıcı Ara</Text>
        <View style={{ width: 40 }} />
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
        <View style={[styles.searchInputWrapper, { backgroundColor: colors.background }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="İsim, meslek veya beceri ara..."
            placeholderTextColor={colors.textSecondary}
            value={filters.q}
            onChangeText={handleSearchChange}
          />
          {filters.q ? (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: activeFilterCount > 0 ? colors.primary : colors.background }]}
          onPress={() => {
            setTempFilters(filters);
            setShowFilters(true);
          }}
        >
          <Ionicons name="options" size={20} color={activeFilterCount > 0 ? '#fff' : colors.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Results Info */}
      <View style={[styles.resultsInfo, { borderBottomColor: colors.border }]}>
        <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
          {total} sonuç bulundu
        </Text>
      </View>
      
      {/* Results List */}
      <FlatList
        data={users}
        renderItem={renderUserCard}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Sonuç Bulunamadı</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Farklı arama kriterleri deneyin
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
      
      {renderFilterModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  resultsInfo: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  resultsCount: { fontSize: 13 },
  listContent: { padding: 16, gap: 12 },
  userCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  userCardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '600' },
  userInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  userName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  userOccupation: { fontSize: 14, marginBottom: 4 },
  currentJobRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  currentJobText: { fontSize: 12, flex: 1 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  locationText: { fontSize: 12 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  skillChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  skillChipText: { fontSize: 11, fontWeight: '500' },
  moreSkills: { fontSize: 11, alignSelf: 'center' },
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptyText: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  footerLoader: { paddingVertical: 20 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  filterTitle: { fontSize: 18, fontWeight: '600' },
  filterContent: { padding: 16 },
  filterSection: { marginBottom: 20 },
  filterLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  filterInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 15,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: { fontSize: 12 },
  sortOptions: { flexDirection: 'row', gap: 8 },
  sortOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  sortOptionText: { fontSize: 13, fontWeight: '500' },
  filterActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  clearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  clearButtonText: { fontSize: 15, fontWeight: '600' },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
