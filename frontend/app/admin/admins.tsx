import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

interface Admin {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  city: string;
  profileImageUrl?: string;
  isAdmin: boolean;
}

export default function AdminAdminsScreen() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [allUsers, setAllUsers] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const response = await api.get('/admin/users');
      const users = response.data;
      setAllUsers(users.filter((u: Admin) => !u.isAdmin));
      setAdmins(users.filter((u: Admin) => u.isAdmin));
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleMakeAdmin = async (userId: string) => {
    Alert.alert(
      'Yönetici Yap',
      'Bu kullanıcıyı yönetici yapmak istediğinize emin misiniz?\n\nYönetici olarak tüm topluluklara süper admin olarak eklenecek.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Yönetici Yap',
          onPress: async () => {
            try {
              await api.post(`/admin/users/${userId}/make-admin`);
              Alert.alert('Başarılı', 'Kullanıcı yönetici yapıldı');
              loadData();
            } catch (error: any) {
              Alert.alert('Hata', error.response?.data?.detail || 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  const handleRemoveAdmin = async (userId: string, email: string) => {
    if (email.toLowerCase() === 'metaticaretim@gmail.com') {
      Alert.alert('Hata', 'Ana yöneticinin yetkisi kaldırılamaz');
      return;
    }

    Alert.alert(
      'Yönetici Yetkisini Kaldır',
      'Bu kullanıcının yönetici yetkisini kaldırmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.post(`/admin/users/${userId}/remove-admin`);
              Alert.alert('Başarılı', 'Yönetici yetkisi kaldırıldı');
              loadData();
            } catch (error: any) {
              Alert.alert('Hata', error.response?.data?.detail || 'İşlem başarısız');
            }
          },
        },
      ]
    );
  };

  const renderAdmin = ({ item }: { item: Admin }) => {
    const isMainAdmin = item.email.toLowerCase() === 'metaticaretim@gmail.com';

    return (
      <View style={styles.adminCard}>
        <View style={styles.avatar}>
          {item.profileImageUrl ? (
            <Image source={{ uri: item.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color="#9ca3af" />
          )}
        </View>
        <View style={styles.adminInfo}>
          <View style={styles.adminNameRow}>
            <Text style={styles.adminName}>{item.firstName} {item.lastName}</Text>
            {isMainAdmin && (
              <View style={styles.mainAdminBadge}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.mainAdminText}>Ana Yönetici</Text>
              </View>
            )}
          </View>
          <Text style={styles.adminEmail}>{item.email}</Text>
          <Text style={styles.adminCity}>
            <Ionicons name="location-outline" size={12} color="#6b7280" /> {item.city}
          </Text>
        </View>
        {!isMainAdmin && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveAdmin(item.uid, item.email)}
          >
            <Ionicons name="shield-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUser = ({ item }: { item: Admin }) => (
    <View style={styles.userCard}>
      <View style={styles.avatar}>
        {item.profileImageUrl ? (
          <Image source={{ uri: item.profileImageUrl }} style={styles.avatarImage} />
        ) : (
          <Ionicons name="person" size={20} color="#9ca3af" />
        )}
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.firstName} {item.lastName}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={styles.makeAdminButton}
        onPress={() => handleMakeAdmin(item.uid)}
      >
        <Ionicons name="shield-checkmark" size={20} color="#10b981" />
      </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Yönetici Yönetimi</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={[{ type: 'content' }]}
        renderItem={() => (
          <View style={styles.content}>
            {/* Current Admins */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mevcut Yöneticiler ({admins.length})</Text>
              {admins.map((admin) => (
                <View key={admin.uid}>
                  {renderAdmin({ item: admin })}
                </View>
              ))}
              {admins.length === 0 && (
                <Text style={styles.emptyText}>Yönetici yok</Text>
              )}
            </View>

            {/* Add Admin Section */}
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.sectionHeader}
                onPress={() => setShowAllUsers(!showAllUsers)}
              >
                <Text style={styles.sectionTitle}>Yönetici Ekle</Text>
                <Ionicons
                  name={showAllUsers ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {showAllUsers && (
                <View style={styles.usersList}>
                  {allUsers.slice(0, 20).map((user) => (
                    <View key={user.uid}>
                      {renderUser({ item: user })}
                    </View>
                  ))}
                  {allUsers.length === 0 && (
                    <Text style={styles.emptyText}>Tüm kullanıcılar zaten yönetici</Text>
                  )}
                  {allUsers.length > 20 && (
                    <Text style={styles.moreText}>
                      +{allUsers.length - 20} daha fazla kullanıcı
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Info Card */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={24} color="#6366f1" />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Yönetici Yetkileri</Text>
                <Text style={styles.infoText}>
                  • Tüm topluluklarda süper yönetici{"\n"}
                  • Kullanıcıları yasaklama/kısıtlama{"\n"}
                  • Mesajları silme/sabitleme{"\n"}
                  • Alt grup oluşturma{"\n"}
                  • Duyuru gönderme
                </Text>
              </View>
            </View>
          </View>
        )}
        keyExtractor={() => 'content'}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
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
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
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
  adminInfo: {
    flex: 1,
    marginLeft: 12,
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mainAdminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  mainAdminText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  adminEmail: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  adminCity: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usersList: {
    marginTop: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  userEmail: {
    color: '#6b7280',
    fontSize: 13,
  },
  makeAdminButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
  },
  moreText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    fontSize: 13,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
  },
});
