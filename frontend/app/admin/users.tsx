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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  profileImageUrl?: string;
  isAdmin: boolean;
  isBanned: boolean;
  isRestricted: boolean;
  restrictedUntil?: string;
}

export default function AdminUsersScreen() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const loadUsers = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/users');
      setUsers(response.data);
      setFilteredUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = users.filter(
        (u) =>
          u.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.city?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsers();
  }, [loadUsers]);

  const handleAction = async (action: string, userId: string) => {
    setActionLoading(true);
    try {
      switch (action) {
        case 'ban':
          await api.post(`/admin/users/${userId}/ban`);
          Alert.alert('Başarılı', 'Kullanıcı yasaklandı');
          break;
        case 'unban':
          await api.post(`/admin/users/${userId}/unban`);
          Alert.alert('Başarılı', 'Yasağı kaldırıldı');
          break;
        case 'restrict':
          await api.post(`/admin/users/${userId}/restrict`, { hours: 24 });
          Alert.alert('Başarılı', 'Kullanıcı 24 saat kısıtlandı');
          break;
        case 'unrestrict':
          await api.post(`/admin/users/${userId}/unrestrict`);
          Alert.alert('Başarılı', 'Kısıtlama kaldırıldı');
          break;
        case 'makeAdmin':
          await api.post(`/admin/users/${userId}/make-admin`);
          Alert.alert('Başarılı', 'Yönetici yapıldı');
          break;
        case 'removeAdmin':
          await api.post(`/admin/users/${userId}/remove-admin`);
          Alert.alert('Başarılı', 'Yönetici yetkisi kaldırıldı');
          break;
        case 'deleteMessages':
          await api.delete(`/admin/users/${userId}/messages`, { data: { hours: 24 } });
          Alert.alert('Başarılı', 'Son 24 saatteki mesajlar silindi');
          break;
      }
      setModalVisible(false);
      loadUsers();
    } catch (error: any) {
      Alert.alert('Hata', error.response?.data?.detail || 'İşlem başarısız');
    } finally {
      setActionLoading(false);
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.avatar}>
        {item.profileImageUrl ? (
          <Image source={{ uri: item.profileImageUrl }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={24} color="#9ca3af" />
        )}
      </View>
      <View style={styles.userInfo}>
        <View style={styles.userNameRow}>
          <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
          {item.isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color="#10b981" />
            </View>
          )}
          {item.isBanned && (
            <View style={styles.bannedBadge}>
              <Ionicons name="ban" size={12} color="#ef4444" />
            </View>
          )}
          {item.isRestricted && (
            <View style={styles.restrictedBadge}>
              <Ionicons name="time" size={12} color="#f59e0b" />
            </View>
          )}
        </View>
        <Text style={styles.userEmail}>{item.email}</Text>
        <Text style={styles.userCity}>
          <Ionicons name="location-outline" size={12} color="#6b7280" /> {item.city}
        </Text>
      </View>
      <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Üye Yönetimi</Text>
        <Text style={styles.headerCount}>{users.length} üye</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Üye ara..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.uid}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      />

      {/* User Actions Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedUser?.firstName} {selectedUser?.lastName}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalEmail}>{selectedUser?.email}</Text>

            <View style={styles.actionsList}>
              {/* Ban/Unban */}
              {selectedUser?.isBanned ? (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('unban', selectedUser.uid)}
                  disabled={actionLoading}
                >
                  <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                  <Text style={styles.actionText}>Yasağı Kaldır</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('ban', selectedUser?.uid || '')}
                  disabled={actionLoading}
                >
                  <Ionicons name="ban" size={24} color="#ef4444" />
                  <Text style={[styles.actionText, { color: '#ef4444' }]}>Yasakla (Ban)</Text>
                </TouchableOpacity>
              )}

              {/* Restrict/Unrestrict */}
              {selectedUser?.isRestricted ? (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('unrestrict', selectedUser.uid)}
                  disabled={actionLoading}
                >
                  <Ionicons name="volume-high" size={24} color="#10b981" />
                  <Text style={styles.actionText}>Kısıtlamayı Kaldır</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('restrict', selectedUser?.uid || '')}
                  disabled={actionLoading}
                >
                  <Ionicons name="volume-mute" size={24} color="#f59e0b" />
                  <Text style={styles.actionText}>Kısıtla (24 saat)</Text>
                </TouchableOpacity>
              )}

              {/* Make/Remove Admin */}
              {selectedUser?.isAdmin ? (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('removeAdmin', selectedUser.uid)}
                  disabled={actionLoading}
                >
                  <Ionicons name="shield-outline" size={24} color="#6b7280" />
                  <Text style={styles.actionText}>Yönetici Yetkisini Kaldır</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => handleAction('makeAdmin', selectedUser?.uid || '')}
                  disabled={actionLoading}
                >
                  <Ionicons name="shield-checkmark" size={24} color="#6366f1" />
                  <Text style={styles.actionText}>Yönetici Yap</Text>
                </TouchableOpacity>
              )}

              {/* Delete Messages */}
              <TouchableOpacity
                style={styles.actionItem}
                onPress={() => handleAction('deleteMessages', selectedUser?.uid || '')}
                disabled={actionLoading}
              >
                <Ionicons name="trash" size={24} color="#ef4444" />
                <Text style={[styles.actionText, { color: '#ef4444' }]}>Son Mesajları Sil</Text>
              </TouchableOpacity>
            </View>

            {actionLoading && (
              <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 16 }} />
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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
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
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  adminBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 4,
    borderRadius: 4,
  },
  bannedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 4,
    borderRadius: 4,
  },
  restrictedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 4,
    borderRadius: 4,
  },
  userEmail: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  userCity: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  modalEmail: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 24,
  },
  actionsList: {
    gap: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
  },
});
