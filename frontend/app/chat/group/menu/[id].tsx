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
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { subgroupApi } from '../../../../src/services/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import api from '../../../../src/services/api';
import { showToast } from '../../../../src/components/ui';

interface SubGroup {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  communityName?: string;
  communityId?: string;
  groupAdmins?: string[];
  members?: string[];
  imageUrl?: string;
  isGroupAdmin?: boolean;
  isSuperAdmin?: boolean;
}

interface Member {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isAdmin?: boolean;
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  creatorName: string;
  createdAt: string;
}

interface PinnedMessage {
  id: string;
  content: string;
  senderName: string;
  timestamp: string;
}

export default function GroupMenuScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [subgroup, setSubgroup] = useState<SubGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const { user, userProfile } = useAuth();
  const router = useRouter();

  const isAdmin = subgroup?.isGroupAdmin || subgroup?.isSuperAdmin || userProfile?.isAdmin;

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [groupRes, membersRes, pollsRes, pinnedRes] = await Promise.all([
        subgroupApi.getOne(groupId),
        subgroupApi.getMembers(groupId).catch(() => ({ data: [] })),
        subgroupApi.getPolls(groupId).catch(() => ({ data: [] })),
        subgroupApi.getPinnedMessages(groupId).catch(() => ({ data: [] })),
      ]);
      
      setSubgroup(groupRes.data);
      setMembers(membersRes.data || []);
      setPolls(pollsRes.data || []);
      setPinnedMessages(pinnedRes.data || []);
    } catch (error) {
      console.error('Error loading group menu:', error);
      showToast.error('Hata', 'Grup bilgileri yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleChangeGroupImage = async () => {
    if (!isAdmin) return;
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploadingImage(true);
      try {
        await api.put(`/api/subgroups/${groupId}/image`, {
          imageData: result.assets[0].base64,
        });
        showToast.success('Başarılı', 'Grup fotoğrafı güncellendi');
        loadData();
      } catch (error) {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleLeaveGroup = async () => {
    Alert.alert('Gruptan Ayrıl', 'Bu gruptan ayrılmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          try {
            await subgroupApi.leave(groupId!);
            showToast.success('Başarılı', 'Gruptan ayrıldınız');
            router.replace('/(tabs)/communities');
          } catch (error) {
            Alert.alert('Hata', 'Ayrılma işlemi başarısız');
          }
        },
      },
    ]);
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim()) {
      Alert.alert('Hata', 'Lütfen bir soru girin');
      return;
    }
    
    const validOptions = pollOptions.filter(o => o.trim());
    if (validOptions.length < 2) {
      Alert.alert('Hata', 'En az 2 seçenek gerekli');
      return;
    }

    setCreatingPoll(true);
    try {
      await subgroupApi.createPoll(groupId!, {
        question: pollQuestion.trim(),
        options: validOptions,
      });
      showToast.success('Başarılı', 'Anket oluşturuldu');
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      loadData();
    } catch (error) {
      Alert.alert('Hata', 'Anket oluşturulamadı');
    } finally {
      setCreatingPoll(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (!subgroup) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
        <Text style={styles.errorText}>Grup bulunamadı</Text>
      </View>
    );
  }

  const description = subgroup.description || 'Bu grup için açıklama eklenmemiş.';
  const shouldTruncate = description.length > 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Grup Bilgisi</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={isAdmin ? handleChangeGroupImage : undefined}
            disabled={!isAdmin || uploadingImage}
          >
            {subgroup.imageUrl ? (
              <Image source={{ uri: subgroup.imageUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.avatarPlaceholder}>
                <Ionicons name="chatbubbles" size={56} color="#fff" />
              </LinearGradient>
            )}
            {isAdmin && (
              <View style={styles.cameraButton}>
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={18} color="#fff" />
                )}
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.groupName}>{subgroup.name}</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.memberCountText}>Grup • {subgroup.memberCount} üye</Text>
          </View>

          {subgroup.communityName && (
            <TouchableOpacity 
              style={styles.communityLink}
              onPress={() => router.push(`/community/${subgroup.communityId}`)}
            >
              <Ionicons name="people" size={16} color="#6366f1" />
              <Text style={styles.communityLinkText}>{subgroup.communityName}</Text>
            </TouchableOpacity>
          )}

          {/* Açıklama */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText} numberOfLines={showFullDescription ? undefined : 3}>
              {description}
            </Text>
            {shouldTruncate && (
              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text style={styles.readMoreText}>
                  {showFullDescription ? 'Daha az göster' : 'Devamını oku'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Anketler Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Ionicons name="stats-chart" size={20} color="#8b5cf6" />
              </View>
              <Text style={styles.sectionTitle}>Anketler</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowPollModal(true)}>
              <Ionicons name="add" size={24} color="#8b5cf6" />
            </TouchableOpacity>
          </View>

          {polls.length > 0 ? (
            <View style={styles.itemList}>
              {polls.slice(0, 3).map((poll) => (
                <View key={poll.id} style={styles.pollCard}>
                  <Text style={styles.pollQuestion}>{poll.question}</Text>
                  <Text style={styles.pollMeta}>
                    {poll.creatorName} • {poll.options.length} seçenek
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="stats-chart-outline" size={40} color="#374151" />
              </View>
              <Text style={styles.emptyText}>Henüz anket yok</Text>
            </View>
          )}
        </View>

        {/* Sabitlenen Mesajlar Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="pin" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.sectionTitle}>Sabitlenen Mesajlar</Text>
            </View>
          </View>

          {pinnedMessages.length > 0 ? (
            <View style={styles.itemList}>
              {pinnedMessages.slice(0, 3).map((msg) => (
                <View key={msg.id} style={styles.pinnedCard}>
                  <Text style={styles.pinnedContent} numberOfLines={2}>{msg.content}</Text>
                  <Text style={styles.pinnedMeta}>{msg.senderName}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="pin-outline" size={40} color="#374151" />
              </View>
              <Text style={styles.emptyText}>Sabitlenen mesaj yok</Text>
            </View>
          )}
        </View>

        {/* Üyeler Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <Ionicons name="people" size={20} color="#10b981" />
              </View>
              <Text style={styles.sectionTitle}>Üyeler</Text>
              <Text style={styles.memberCount}>{subgroup.memberCount}</Text>
            </View>
          </View>

          <View style={styles.memberList}>
            {members.slice(0, 5).map((member) => {
              const isMemberAdmin = subgroup.groupAdmins?.includes(member.uid);
              return (
                <TouchableOpacity
                  key={member.uid}
                  style={styles.memberCard}
                  onPress={() => router.push(`/user/${member.uid}`)}
                >
                  <View style={styles.memberAvatar}>
                    {member.profileImageUrl ? (
                      <Image source={{ uri: member.profileImageUrl }} style={styles.memberAvatarImage} />
                    ) : (
                      <Ionicons name="person" size={20} color="#9ca3af" />
                    )}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.firstName} {member.lastName}</Text>
                    {isMemberAdmin && (
                      <Text style={styles.adminBadge}>Grup Yöneticisi</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </TouchableOpacity>
              );
            })}
            
            {members.length > 5 && (
              <TouchableOpacity style={styles.showAllButton}>
                <Text style={styles.showAllText}>Tüm üyeleri gör ({subgroup.memberCount})</Text>
                <Ionicons name="chevron-forward" size={18} color="#6366f1" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Yönetici Araçları */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
                </View>
                <Text style={styles.sectionTitle}>Yönetici Araçları</Text>
              </View>
            </View>

            <View style={styles.adminToolsList}>
              <TouchableOpacity style={styles.adminToolItem} onPress={handleChangeGroupImage}>
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <Ionicons name="camera" size={20} color="#6366f1" />
                </View>
                <Text style={styles.adminToolText}>Profil Fotoğrafı</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminToolItem}>
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="person-add" size={20} color="#10b981" />
                </View>
                <Text style={styles.adminToolText}>Üye Ekle</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminToolItem}>
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="settings" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.adminToolText}>Grup Ayarları</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Gruptan Ayrıl */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveGroup}>
            <Ionicons name="exit-outline" size={22} color="#ef4444" />
            <Text style={styles.leaveButtonText}>Gruptan Ayrıl</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Anket Oluşturma Modal */}
      <Modal visible={showPollModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Anket</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.pollInput}
                placeholder="Soru..."
                placeholderTextColor="#6b7280"
                value={pollQuestion}
                onChangeText={setPollQuestion}
              />

              {pollOptions.map((option, index) => (
                <View key={index} style={styles.optionRow}>
                  <TextInput
                    style={styles.optionInput}
                    placeholder={`Seçenek ${index + 1}`}
                    placeholderTextColor="#6b7280"
                    value={option}
                    onChangeText={(text) => {
                      const newOptions = [...pollOptions];
                      newOptions[index] = text;
                      setPollOptions(newOptions);
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <TouchableOpacity
                      onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== index))}
                    >
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {pollOptions.length < 5 && (
                <TouchableOpacity
                  style={styles.addOptionButton}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <Ionicons name="add" size={20} color="#6366f1" />
                  <Text style={styles.addOptionText}>Seçenek Ekle</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.createPollButton, creatingPoll && styles.disabledButton]}
                onPress={handleCreatePoll}
                disabled={creatingPoll}
              >
                {creatingPoll ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="stats-chart" size={20} color="#fff" />
                    <Text style={styles.createPollText}>Anket Oluştur</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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

  // Header
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
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },

  scrollView: {
    flex: 1,
  },

  // Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomWidth: 8,
    borderBottomColor: '#111827',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0a0a0a',
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  memberCountText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  communityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 16,
  },
  communityLinkText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '500',
  },
  descriptionContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  descriptionText: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  readMoreText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },

  // Section Styles
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 8,
    borderBottomColor: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  memberCount: {
    color: '#6b7280',
    fontSize: 14,
    marginLeft: 8,
  },
  addButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Item List
  itemList: {
    gap: 10,
  },
  pollCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  pollQuestion: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  pollMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },
  pinnedCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  pinnedContent: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  pinnedMeta: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 4,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
  },

  // Members
  memberList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  memberAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  adminBadge: {
    color: '#6366f1',
    fontSize: 12,
    marginTop: 2,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  showAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },

  // Admin Tools
  adminToolsList: {
    gap: 8,
  },
  adminToolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
  },
  adminToolIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  adminToolText: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    marginLeft: 12,
  },

  // Leave Button
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  leaveButtonText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#6b7280',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  pollInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  addOptionText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  createPollButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  createPollText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
