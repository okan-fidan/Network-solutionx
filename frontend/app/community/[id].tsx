import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityApi, subgroupApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';

interface Community {
  id: string;
  name: string;
  city: string;
  description?: string;
  memberCount: number;
  isMember: boolean;
  isSuperAdmin: boolean;
  subGroupsList?: SubGroup[];
}

interface SubGroup {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  isMember: boolean;
}

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const { userProfile } = useAuth();
  const router = useRouter();

  const loadCommunity = useCallback(async () => {
    if (!id) return;
    try {
      const response = await communityApi.getOne(id);
      setCommunity(response.data);
    } catch (error) {
      console.error('Error loading community:', error);
      Alert.alert('Hata', 'Topluluk yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadCommunity();
  }, [loadCommunity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCommunity();
  }, [loadCommunity]);

  const handleJoin = async () => {
    if (!community) return;
    setJoining(true);
    try {
      if (community.isMember) {
        await communityApi.leave(community.id);
      } else {
        await communityApi.join(community.id);
      }
      loadCommunity();
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinSubgroup = async (subgroup: SubGroup) => {
    try {
      if (subgroup.isMember) {
        router.push(`/chat/group/${subgroup.id}`);
      } else {
        await subgroupApi.join(subgroup.id);
        loadCommunity();
      }
    } catch (error) {
      console.error('Error joining subgroup:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!community) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Topluluk bulunamadı</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Community Info */}
        <View style={styles.communityHeader}>
          <View style={styles.communityIcon}>
            <Ionicons name="people" size={48} color="#6366f1" />
          </View>
          <Text style={styles.communityName}>{community.name}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location" size={18} color="#6366f1" />
            <Text style={styles.locationText}>{community.city}</Text>
          </View>
          <Text style={styles.memberCount}>{community.memberCount} üye</Text>
          {community.description && (
            <Text style={styles.description}>{community.description}</Text>
          )}

          <TouchableOpacity
            style={[
              styles.joinButton,
              community.isMember && styles.leaveButton,
            ]}
            onPress={handleJoin}
            disabled={joining}
          >
            {joining ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={community.isMember ? 'exit-outline' : 'enter-outline'}
                  size={20}
                  color="#fff"
                />
                <Text style={styles.joinButtonText}>
                  {community.isMember ? 'Ayrıl' : 'Katıl'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Subgroups */}
        <View style={styles.subgroupsSection}>
          <Text style={styles.sectionTitle}>Alt Gruplar</Text>
          
          {community.subGroupsList && community.subGroupsList.length > 0 ? (
            community.subGroupsList.map((subgroup) => (
              <TouchableOpacity
                key={subgroup.id}
                style={styles.subgroupCard}
                onPress={() => handleJoinSubgroup(subgroup)}
              >
                <View style={styles.subgroupIcon}>
                  <Ionicons name="chatbubbles" size={24} color="#6366f1" />
                </View>
                <View style={styles.subgroupInfo}>
                  <Text style={styles.subgroupName}>{subgroup.name}</Text>
                  <Text style={styles.subgroupMembers}>{subgroup.memberCount} üye</Text>
                </View>
                {subgroup.isMember ? (
                  <View style={styles.memberBadge}>
                    <Ionicons name="checkmark" size={14} color="#10b981" />
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={22} color="#6b7280" />
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySubgroups}>
              <Ionicons name="chatbubbles-outline" size={48} color="#374151" />
              <Text style={styles.emptyText}>Henüz alt grup yok</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
  errorContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginTop: 16,
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  communityHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  communityIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  communityName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  locationText: {
    color: '#9ca3af',
    fontSize: 16,
  },
  memberCount: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
  description: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 24,
    gap: 8,
  },
  leaveButton: {
    backgroundColor: '#374151',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subgroupsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  subgroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  subgroupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subgroupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subgroupName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  subgroupMembers: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
  memberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySubgroups: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 12,
  },
});
