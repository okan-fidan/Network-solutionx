import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

interface Mentor {
  id: string;
  userId: string;
  expertise: string[];
  experience: string;
  hourlyRate: number;
  status: string;
  bio?: string;
  createdAt: string;
  userInfo?: {
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    rating?: { average: number; count: number };
  };
}

export default function AdminMentorsScreen() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const router = useRouter();

  const loadMentors = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/mentors');
      setMentors(response.data || []);
    } catch (error) {
      console.error('Failed to load mentors:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMentors();
  }, [loadMentors]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadMentors();
  }, [loadMentors]);

  const handleStatusChange = async (mentorId: string, newStatus: string) => {
    Alert.alert(
      'Durumu Değiştir',
      `Mentor durumunu "${newStatus}" olarak değiştirmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              await api.put(`/api/admin/mentors/${mentorId}/status`, { status: newStatus });
              Alert.alert('Başarılı', 'Mentor durumu güncellendi');
              loadMentors();
            } catch (error) {
              Alert.alert('Hata', 'Durum güncellenemedi');
            }
          },
        },
      ]
    );
  };

  const handleDelete = async (mentorId: string) => {
    Alert.alert(
      'Mentor Sil',
      'Bu mentoru silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/mentors/${mentorId}`);
              Alert.alert('Başarılı', 'Mentor silindi');
              loadMentors();
            } catch (error) {
              Alert.alert('Hata', 'Mentor silinemedi');
            }
          },
        },
      ]
    );
  };

  const filteredMentors = mentors.filter(m => {
    if (filter === 'all') return true;
    return m.status === filter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Onaylandı';
      case 'pending': return 'Beklemede';
      case 'rejected': return 'Reddedildi';
      default: return status;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentor Yönetimi</Text>
        <TouchableOpacity onPress={loadMentors}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab === 'all' ? 'Tümü' : getStatusText(tab)}
            </Text>
            {tab !== 'all' && (
              <View style={[styles.filterBadge, { backgroundColor: getStatusColor(tab) }]}>
                <Text style={styles.filterBadgeText}>
                  {mentors.filter(m => m.status === tab).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {filteredMentors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="school-outline" size={64} color="#4b5563" />
            <Text style={styles.emptyText}>Henüz mentor yok</Text>
          </View>
        ) : (
          filteredMentors.map((mentor) => (
            <View key={mentor.id} style={styles.mentorCard}>
              <View style={styles.mentorHeader}>
                <View style={styles.mentorAvatar}>
                  {mentor.userInfo?.profileImageUrl ? (
                    <Image source={{ uri: mentor.userInfo.profileImageUrl }} style={styles.avatarImage} />
                  ) : (
                    <Ionicons name="person" size={24} color="#9ca3af" />
                  )}
                </View>
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>
                    {mentor.userInfo?.firstName} {mentor.userInfo?.lastName}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text style={styles.ratingText}>
                      {mentor.userInfo?.rating?.average?.toFixed(1) || '0.0'} ({mentor.userInfo?.rating?.count || 0})
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(mentor.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(mentor.status)}</Text>
                </View>
              </View>

              <View style={styles.mentorDetails}>
                <View style={styles.detailRow}>
                  <Ionicons name="briefcase-outline" size={16} color="#9ca3af" />
                  <Text style={styles.detailText}>{mentor.experience} deneyim</Text>
                </View>
                <View style={styles.detailRow}>
                  <Ionicons name="cash-outline" size={16} color="#9ca3af" />
                  <Text style={styles.detailText}>{mentor.hourlyRate} TL/saat</Text>
                </View>
              </View>

              <View style={styles.expertiseContainer}>
                {mentor.expertise?.slice(0, 3).map((exp, i) => (
                  <View key={i} style={styles.expertiseTag}>
                    <Text style={styles.expertiseText}>{exp}</Text>
                  </View>
                ))}
              </View>

              {mentor.bio && (
                <Text style={styles.bioText} numberOfLines={2}>{mentor.bio}</Text>
              )}

              <View style={styles.actionButtons}>
                {mentor.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleStatusChange(mentor.id, 'approved')}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleStatusChange(mentor.id, 'rejected')}
                    >
                      <Ionicons name="close" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Reddet</Text>
                    </TouchableOpacity>
                  </>
                )}
                {mentor.status === 'approved' && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.suspendButton]}
                    onPress={() => handleStatusChange(mentor.id, 'suspended')}
                  >
                    <Ionicons name="pause" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Askıya Al</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(mentor.id)}
                >
                  <Ionicons name="trash" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  filterTabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937', gap: 6 },
  filterTabActive: { backgroundColor: '#6366f1' },
  filterTabText: { color: '#9ca3af', fontSize: 13, fontWeight: '500' },
  filterTabTextActive: { color: '#fff' },
  filterBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  filterBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#6b7280', fontSize: 16, marginTop: 16 },
  mentorCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  mentorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mentorAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  mentorInfo: { flex: 1, marginLeft: 12 },
  mentorName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  ratingText: { color: '#9ca3af', fontSize: 13 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  mentorDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#9ca3af', fontSize: 13 },
  expertiseContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  expertiseTag: { backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  expertiseText: { color: '#a5b4fc', fontSize: 12 },
  bioText: { color: '#9ca3af', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  actionButtons: { flexDirection: 'row', gap: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 6 },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  approveButton: { backgroundColor: '#10b981' },
  rejectButton: { backgroundColor: '#ef4444' },
  suspendButton: { backgroundColor: '#f59e0b' },
  deleteButton: { backgroundColor: '#374151', marginLeft: 'auto' },
});
