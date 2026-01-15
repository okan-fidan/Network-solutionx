import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { subgroupApi } from '../../../../src/services/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { showToast } from '../../../../src/components/ui';
import api from '../../../../src/services/api';

interface Member {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isOnline?: boolean;
  lastSeen?: string;
  bio?: string;
}

interface SubGroup {
  id: string;
  name: string;
  groupAdmins?: string[];
  creatorId?: string;
}

export default function GroupMembersScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [subgroup, setSubgroup] = useState<SubGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const isAdmin = subgroup?.groupAdmins?.includes(user?.uid || '') || userProfile?.isAdmin;

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [membersRes, groupRes] = await Promise.all([
        subgroupApi.getMembers(groupId),
        subgroupApi.getOne(groupId),
      ]);
      setMembers(membersRes.data || []);
      setSubgroup(groupRes.data);
    } catch (error) {
      console.error('Error loading members:', error);
      showToast.error('Hata', 'Üyeler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMembers = members.filter(member => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  // Üyeleri grupla: Adminler, sonra diğerleri (alfabetik)
  const groupedMembers = {
    admins: filteredMembers.filter(m => subgroup?.groupAdmins?.includes(m.uid)),
    members: filteredMembers.filter(m => !subgroup?.groupAdmins?.includes(m.uid)),
  };

  const handleMemberPress = (member: Member) => {
    router.push(`/user/${member.uid}`);
  };

  const handleMemberLongPress = (member: Member) => {
    if (!isAdmin) return;
    
    const isMemberAdmin = subgroup?.groupAdmins?.includes(member.uid);
    const isCreator = subgroup?.creatorId === member.uid;
    
    if (isCreator) {
      Alert.alert('Bilgi', 'Grup kurucusu değiştirilemez');
      return;
    }

    const options = [
      { text: 'Profili Görüntüle', onPress: () => router.push(`/user/${member.uid}`) },
    ];

    if (isMemberAdmin) {
      options.push({
        text: 'Yöneticilikten Çıkar',
        onPress: () => handleRemoveAdmin(member.uid),
      });
    } else {
      options.push({
        text: 'Yönetici Yap',
        onPress: () => handleMakeAdmin(member.uid),
      });
    }

    if (member.uid !== user?.uid) {
      options.push({
        text: 'Gruptan Çıkar',
        onPress: () => handleRemoveMember(member.uid),
        style: 'destructive' as const,
      } as any);
    }

    options.push({ text: 'İptal', style: 'cancel' as const } as any);

    Alert.alert('Üye İşlemleri', `${member.firstName} ${member.lastName}`, options as any);
  };

  const handleMakeAdmin = async (userId: string) => {
    try {
      await api.post(`/api/subgroups/${groupId}/${userId}/make-admin`);
      showToast.success('Başarılı', 'Kullanıcı yönetici yapıldı');
      loadData();
    } catch (error) {
      showToast.error('Hata', 'İşlem başarısız');
    }
  };

  const handleRemoveAdmin = async (userId: string) => {
    try {
      await api.post(`/api/subgroups/${groupId}/${userId}/remove-admin`);
      showToast.success('Başarılı', 'Yöneticilik kaldırıldı');
      loadData();
    } catch (error) {
      showToast.error('Hata', 'İşlem başarısız');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    Alert.alert(
      'Üyeyi Çıkar',
      'Bu üyeyi gruptan çıkarmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/subgroups/${groupId}/members/${userId}`);
              showToast.success('Başarılı', 'Üye gruptan çıkarıldı');
              loadData();
            } catch (error) {
              showToast.error('Hata', 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  const renderMemberItem = ({ item, isAdminSection }: { item: Member; isAdminSection?: boolean }) => {
    const isMemberAdmin = subgroup?.groupAdmins?.includes(item.uid);
    const isCreator = subgroup?.creatorId === item.uid;
    const isMe = item.uid === user?.uid;

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => handleMemberPress(item)}
        onLongPress={() => handleMemberLongPress(item)}
        delayLongPress={500}
      >
        <View style={styles.memberAvatarWrapper}>
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.memberAvatar} />
          ) : (
            <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.memberAvatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {item.firstName.charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>
              {item.firstName} {item.lastName}
              {isMe && <Text style={styles.youLabel}> (Sen)</Text>}
            </Text>
            {isCreator && (
              <View style={styles.creatorBadge}>
                <Ionicons name="star" size={10} color="#f59e0b" />
              </View>
            )}
            {isMemberAdmin && !isCreator && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#10b981" />
              </View>
            )}
          </View>
          <Text style={styles.memberBio} numberOfLines={1}>
            {item.bio || (isMemberAdmin ? 'Grup Yöneticisi' : 'Üye')}
          </Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#4b5563" />
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Grup Üyeleri</Text>
          <Text style={styles.headerSubtitle}>{members.length} üye</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="person-add" size={22} color="#6366f1" />
          </TouchableOpacity>
        )}
        {!isAdmin && <View style={{ width: 44 }} />}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search" size={18} color="#6b7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Üye ara..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Members List */}
      <FlatList
        data={[...groupedMembers.admins, ...groupedMembers.members]}
        keyExtractor={(item) => item.uid}
        renderItem={({ item, index }) => {
          const isFirstAdmin = index === 0 && groupedMembers.admins.length > 0;
          const isFirstMember = index === groupedMembers.admins.length && groupedMembers.members.length > 0;
          
          return (
            <>
              {isFirstAdmin && renderSectionHeader('Yöneticiler', groupedMembers.admins.length)}
              {isFirstMember && renderSectionHeader('Üyeler', groupedMembers.members.length)}
              {renderMemberItem({ item })}
            </>
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#374151" />
            <Text style={styles.emptyText}>
              {searchQuery ? 'Sonuç bulunamadı' : 'Henüz üye yok'}
            </Text>
          </View>
        }
      />
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
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  listContent: {
    paddingBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#111827',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6366f1',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  memberAvatarWrapper: {
    position: 'relative',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  memberAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: 'bold',
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
    borderColor: '#0a0a0a',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  youLabel: {
    color: '#6366f1',
    fontWeight: '400',
  },
  creatorBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberBio: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 12,
  },
});
