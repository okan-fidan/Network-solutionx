import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

interface Community {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  superAdminCount: number;
  subGroupCount: number;
  bannedCount: number;
}

interface Member {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  isSuperAdmin: boolean;
  isBannedFromCommunity: boolean;
}

export default function AdminCommunitiesScreen() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [filteredCommunities, setFilteredCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersModalVisible, setMembersModalVisible] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const router = useRouter();

  const loadCommunities = useCallback(async () => {
    try {
      const response = await api.get('/admin/communities');
      setCommunities(response.data);
      setFilteredCommunities(response.data);
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
    if (searchQuery) {
      const filtered = communities.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCommunities(filtered);
    } else {
      setFilteredCommunities(communities);
    }
  }, [searchQuery, communities]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCommunities();
  }, [loadCommunities]);

  const loadMembers = async (communityId: string) => {
    setLoadingMembers(true);
    try {
      const response = await api.get(`/admin/communities/${communityId}/members`);
      setMembers(response.data);
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenMembers = async (community: Community) => {
    setSelectedCommunity(community);
    setMembersModalVisible(true);
    await loadMembers(community.id);
  };

  const handleMemberAction = async (action: string, userId: string) => {
    if (!selectedCommunity) return;

    try {
      switch (action) {
        case 'ban':
          await api.post(`/admin/communities/${selectedCommunity.id}/ban/${userId}`);
          Alert.alert('Başarılı', 'Kullanıcı yasaklandı');
          break;
        case 'kick':
          await api.post(`/admin/communities/${selectedCommunity.id}/kick/${userId}`);
          Alert.alert('Başarılı', 'Kullanıcı çıkarıldı');
          break;
        case 'addSuperAdmin':
          await api.post(`/admin/communities/${selectedCommunity.id}/super-admin/${userId}`);
          Alert.alert('Başarılı', 'Süper yönetici eklendi');
          break;
        case 'removeSuperAdmin':
          await api.delete(`/admin/communities/${selectedCommunity.id}/super-admin/${userId}`);
          Alert.alert('Başarılı', 'Süper yönetici kaldırıldı');
          break;
      }
      await loadMembers(selectedCommunity.id);
      loadCommunities();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.detail || 'İşlem başarısız');
    }
  };

  const renderCommunity = ({ item }: { item: Community }) => (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => handleOpenMembers(item)}
    >
      <View style={styles.communityIcon}>
        <Ionicons name="people" size={24} color="#6366f1" />
      </View>
      <View style={styles.communityInfo}>
        <Text style={styles.communityName}>{item.name}</Text>
        <Text style={styles.communityCity}>
          <Ionicons name="location-outline" size={12} color="#6b7280" /> {item.city}
        </Text>
        <View style={styles.communityStats}>
          <Text style={styles.statText}>{item.memberCount} üye</Text>
          <Text style={styles.statText}>•</Text>
          <Text style={styles.statText}>{item.subGroupCount} grup</Text>
          {item.bannedCount > 0 && (
            <>
              <Text style={styles.statText}>•</Text>
              <Text style={[styles.statText, { color: '#ef4444' }]}>{item.bannedCount} yasaklı</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  const renderMember = ({ item }: { item: Member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
          {item.isSuperAdmin && (
            <View style={styles.superAdminBadge}>
              <Ionicons name="shield" size={12} color="#6366f1" />
            </View>
          )}
        </View>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      <View style={styles.memberActions}>
        {item.isSuperAdmin ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleMemberAction('removeSuperAdmin', item.uid)}
          >
            <Ionicons name="shield-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleMemberAction('addSuperAdmin', item.uid)}
          >
            <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleMemberAction('kick', item.uid)}
        >
          <Ionicons name="exit" size={20} color="#f59e0b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => handleMemberAction('ban', item.uid)}
        >
          <Ionicons name="ban" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Topluluk Yönetimi</Text>
        <Text style={styles.headerCount}>{communities.length} topluluk</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Topluluk veya şehir ara..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredCommunities}
        renderItem={renderCommunity}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      />

      {/* Members Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={membersModalVisible}
        onRequestClose={() => setMembersModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{selectedCommunity?.name}</Text>
                <Text style={styles.modalSubtitle}>{members.length} üye</Text>
              </View>
              <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {loadingMembers ? (
              <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 32 }} />
            ) : (
              <FlatList
                data={members}
                renderItem={renderMember}
                keyExtractor={(item) => item.uid}
                style={styles.membersList}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Henüz üye yok</Text>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 16,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerCount: {
    fontSize: 14,
    color: '#6b7280',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  communityName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  communityCity: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  communityStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statText: {
    color: '#6b7280',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  modalSubtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  membersList: {
    maxHeight: 400,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  superAdminBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    padding: 4,
    borderRadius: 4,
  },
  memberEmail: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 32,
  },
});
