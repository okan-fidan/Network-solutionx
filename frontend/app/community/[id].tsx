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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { communityApi, subgroupRequestApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/services/api';
import { showToast } from '../../src/components/ui';

const { width } = Dimensions.get('window');

interface Announcement {
  id: string;
  content: string;
  senderName: string;
  timestamp: string;
}

interface Community {
  id: string;
  name: string;
  city: string;
  description?: string;
  memberCount: number;
  isMember: boolean;
  isSuperAdmin: boolean;
  imageUrl?: string;
  subGroupsList?: SubGroup[];
}

interface SubGroup {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  isMember: boolean;
  hasPendingRequest?: boolean;
  imageUrl?: string;
}

// Alt grup için ikon ve renk belirleme
const SUBGROUP_THEMES: { [key: string]: { icon: string; color: string; gradient: string[] } } = {
  'duyuru': { icon: 'megaphone', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
  'start': { icon: 'rocket', color: '#10b981', gradient: ['#10b981', '#059669'] },
  'başla': { icon: 'rocket', color: '#10b981', gradient: ['#10b981', '#059669'] },
  'gelişim': { icon: 'trending-up', color: '#3b82f6', gradient: ['#3b82f6', '#2563eb'] },
  'değerlendirme': { icon: 'analytics', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'] },
  'mastermind': { icon: 'bulb', color: '#8b5cf6', gradient: ['#8b5cf6', '#7c3aed'] },
  'default': { icon: 'chatbubbles', color: '#6366f1', gradient: ['#6366f1', '#4f46e5'] },
};

const getSubgroupTheme = (name: string) => {
  const lowerName = name.toLowerCase();
  for (const key of Object.keys(SUBGROUP_THEMES)) {
    if (lowerName.includes(key)) return SUBGROUP_THEMES[key];
  }
  return SUBGROUP_THEMES['default'];
};

export default function CommunityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [community, setCommunity] = useState<Community | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joiningSubgroup, setJoiningSubgroup] = useState<string | null>(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { userProfile, user } = useAuth();
  const router = useRouter();

  const isAdmin = community?.isSuperAdmin || userProfile?.isAdmin;

  const loadCommunity = useCallback(async () => {
    if (!id) return;
    try {
      const response = await communityApi.getOne(id);
      setCommunity(response.data);
    } catch (error) {
      console.error('Error loading community:', error);
      showToast.error('Hata', 'Topluluk yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const loadAnnouncements = useCallback(async () => {
    if (!id) return;
    try {
      const response = await communityApi.getAnnouncements(id);
      setAnnouncements(response.data || []);
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  }, [id]);

  useEffect(() => {
    loadCommunity();
    loadAnnouncements();
  }, [loadCommunity, loadAnnouncements]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCommunity();
    loadAnnouncements();
  }, [loadCommunity, loadAnnouncements]);

  const handleJoin = async () => {
    if (!community) return;
    setJoining(true);
    try {
      if (community.isMember) {
        await communityApi.leave(community.id);
        showToast.success('Başarılı', 'Topluluktan ayrıldınız');
      } else {
        await communityApi.join(community.id);
        showToast.success('Başarılı', 'Topluluğa katıldınız!');
      }
      loadCommunity();
      loadAnnouncements();
    } catch (error) {
      console.error('Error joining/leaving community:', error);
      Alert.alert('Hata', 'İşlem başarısız');
    } finally {
      setJoining(false);
    }
  };

  const handleSubgroupAction = async (subgroup: SubGroup) => {
    if (subgroup.isMember) {
      router.push(`/chat/group/${subgroup.id}`);
    } else if (subgroup.hasPendingRequest) {
      Alert.alert('Bilgi', 'Bu grup için zaten bir katılım isteğiniz var. Yönetici onayı bekleniyor.');
    } else {
      setJoiningSubgroup(subgroup.id);
      try {
        const response = await subgroupRequestApi.requestJoin(subgroup.id);
        if (response.data.status === 'joined') {
          showToast.success('Başarılı', 'Gruba katıldınız!');
        } else {
          showToast.info('İstek Gönderildi', 'Yönetici onayı bekleniyor.');
        }
        loadCommunity();
      } catch (error: any) {
        const message = error.response?.data?.detail || 'İşlem başarısız';
        Alert.alert('Hata', message);
      } finally {
        setJoiningSubgroup(null);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Az önce';
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const handleSendAnnouncement = async () => {
    if (!announcementText.trim()) {
      Alert.alert('Hata', 'Lütfen bir duyuru metni girin');
      return;
    }

    setSendingAnnouncement(true);
    try {
      await communityApi.sendAnnouncement(id!, { content: announcementText.trim() });
      showToast.success('Başarılı', 'Duyuru gönderildi');
      setShowAnnouncementModal(false);
      setAnnouncementText('');
      loadAnnouncements();
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.detail || 'Duyuru gönderilemedi');
    } finally {
      setSendingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    Alert.alert('Duyuruyu Sil', 'Bu duyuruyu silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await communityApi.deleteAnnouncement(id!, announcementId);
            loadAnnouncements();
          } catch (error) {
            Alert.alert('Hata', 'Duyuru silinemedi');
          }
        },
      },
    ]);
  };

  const handleChangeCommunityImage = async () => {
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
        await api.put(`/api/communities/${id}/image`, {
          imageData: result.assets[0].base64,
        });
        showToast.success('Başarılı', 'Topluluk fotoğrafı güncellendi');
        loadCommunity();
      } catch (error) {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi');
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleLeaveCommunity = async () => {
    Alert.alert('Topluluktan Ayrıl', 'Bu topluluktan ayrılmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Ayrıl',
        style: 'destructive',
        onPress: async () => {
          try {
            await communityApi.leave(community!.id);
            showToast.success('Başarılı', 'Topluluktan ayrıldınız');
            setShowSettingsModal(false);
            router.back();
          } catch (error) {
            Alert.alert('Hata', 'Ayrılma işlemi başarısız');
          }
        },
      },
    ]);
  };

  // Üyelik durumu badge'i
  const renderMembershipBadge = (subgroup: SubGroup) => {
    if (joiningSubgroup === subgroup.id) {
      return <ActivityIndicator size="small" color="#10b981" />;
    }

    if (subgroup.isMember) {
      return (
        <View style={styles.membershipBadge}>
          <Ionicons name="checkmark-circle" size={22} color="#10b981" />
        </View>
      );
    }

    if (subgroup.hasPendingRequest) {
      return (
        <View style={[styles.membershipBadge, styles.pendingBadge]}>
          <Ionicons name="time" size={22} color="#f59e0b" />
        </View>
      );
    }

    return (
      <View style={[styles.membershipBadge, styles.joinableBadge]}>
        <Ionicons name="add" size={22} color="#6b7280" />
      </View>
    );
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

  const description = community.description || `${community.city} ilindeki girişimcilerin buluşma noktası`;
  const shouldTruncateDescription = description.length > 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
          <Text style={styles.headerSubtitle}>{community.memberCount} üye</Text>
        </View>
        {community.isMember && (
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowSettingsModal(true)}>
            <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        {!community.isMember && <View style={{ width: 44 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        {/* Profile Section - WhatsApp Style */}
        <View style={styles.profileSection}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={isAdmin ? handleChangeCommunityImage : undefined}
            disabled={!isAdmin || uploadingImage}
          >
            {community.imageUrl ? (
              <Image source={{ uri: community.imageUrl }} style={styles.avatar} />
            ) : (
              <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.avatarPlaceholder}>
                <Ionicons name="people" size={56} color="#fff" />
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

          <Text style={styles.communityName}>{community.name}</Text>
          
          <View style={styles.locationRow}>
            <Ionicons name="location" size={16} color="#6366f1" />
            <Text style={styles.locationText}>{community.city}</Text>
            <View style={styles.dotSeparator} />
            <Text style={styles.memberCountText}>{community.memberCount} üye</Text>
          </View>

          {/* Açıklama - Devamını Oku */}
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionText} numberOfLines={showFullDescription ? undefined : 3}>
              {description}
            </Text>
            {shouldTruncateDescription && (
              <TouchableOpacity onPress={() => setShowFullDescription(!showFullDescription)}>
                <Text style={styles.readMoreText}>
                  {showFullDescription ? 'Daha az göster' : 'Devamını oku'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Katıl Butonu */}
          {!community.isMember && (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={handleJoin}
              disabled={joining}
            >
              {joining ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={20} color="#fff" />
                  <Text style={styles.joinButtonText}>Topluluğa Katıl</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Duyurular Section - WhatsApp Style */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Ionicons name="megaphone" size={20} color="#f59e0b" />
              </View>
              <Text style={styles.sectionTitle}>Duyurular</Text>
            </View>
            {isAdmin && (
              <TouchableOpacity style={styles.addButton} onPress={() => setShowAnnouncementModal(true)}>
                <Ionicons name="add" size={24} color="#f59e0b" />
              </TouchableOpacity>
            )}
          </View>

          {announcements.length > 0 ? (
            <View style={styles.announcementList}>
              {announcements.slice(0, 3).map((announcement) => (
                <View key={announcement.id} style={styles.announcementCard}>
                  <View style={styles.announcementHeader}>
                    <Text style={styles.announcementSender}>{announcement.senderName}</Text>
                    <View style={styles.announcementMeta}>
                      <Text style={styles.announcementTime}>{formatDate(announcement.timestamp)}</Text>
                      {isAdmin && (
                        <TouchableOpacity onPress={() => handleDeleteAnnouncement(announcement.id)}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.announcementContent}>{announcement.content}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="megaphone-outline" size={48} color="#374151" />
              </View>
              <Text style={styles.emptyText}>Henüz duyuru yok</Text>
              <Text style={styles.emptySubtext}>Topluluk duyuruları burada görünecek</Text>
            </View>
          )}
        </View>

        {/* Alt Gruplar Section - WhatsApp Style */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                <Ionicons name="chatbubbles" size={20} color="#6366f1" />
              </View>
              <Text style={styles.sectionTitle}>Alt Gruplar</Text>
            </View>
          </View>
          
          <Text style={styles.sectionSubtitle}>
            Gruplara katılmak için yönetici onayı gereklidir
          </Text>

          {community.subGroupsList && community.subGroupsList.length > 0 ? (
            <View style={styles.subgroupList}>
              {community.subGroupsList.map((subgroup) => {
                const theme = getSubgroupTheme(subgroup.name);
                const displayName = subgroup.name.replace(`${community.name} - `, '');
                
                return (
                  <TouchableOpacity
                    key={subgroup.id}
                    style={styles.subgroupCard}
                    onPress={() => handleSubgroupAction(subgroup)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient 
                      colors={theme.gradient} 
                      style={styles.subgroupIconWrapper}
                    >
                      <Ionicons name={theme.icon as any} size={24} color="#fff" />
                    </LinearGradient>
                    
                    <View style={styles.subgroupInfo}>
                      <Text style={styles.subgroupName}>{displayName}</Text>
                      {subgroup.description && (
                        <Text style={styles.subgroupDescription} numberOfLines={1}>
                          {subgroup.description}
                        </Text>
                      )}
                      <Text style={styles.subgroupMembers}>{subgroup.memberCount} üye</Text>
                    </View>

                    {renderMembershipBadge(subgroup)}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="chatbubbles-outline" size={48} color="#374151" />
              </View>
              <Text style={styles.emptyText}>Henüz alt grup yok</Text>
            </View>
          )}
        </View>

        {/* Yönetici Araçları - Sadece admin için */}
        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                  <Ionicons name="shield-checkmark" size={20} color="#8b5cf6" />
                </View>
                <Text style={styles.sectionTitle}>Yönetici Araçları</Text>
              </View>
            </View>

            <View style={styles.adminToolsList}>
              <TouchableOpacity 
                style={styles.adminToolItem}
                onPress={handleChangeCommunityImage}
              >
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <Ionicons name="camera" size={20} color="#6366f1" />
                </View>
                <Text style={styles.adminToolText}>Profil Fotoğrafı</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.adminToolItem}
                onPress={() => setShowAnnouncementModal(true)}
              >
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Ionicons name="megaphone" size={20} color="#f59e0b" />
                </View>
                <Text style={styles.adminToolText}>Duyuru Gönder</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminToolItem}>
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="people" size={20} color="#10b981" />
                </View>
                <Text style={styles.adminToolText}>Üyeleri Yönet</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.adminToolItem}>
                <View style={[styles.adminToolIcon, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <Ionicons name="settings" size={20} color="#3b82f6" />
                </View>
                <Text style={styles.adminToolText}>Topluluk Ayarları</Text>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Ayarlar Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Topluluk Ayarları</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.settingsModalBody}>
              <TouchableOpacity style={styles.settingsOption}>
                <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="notifications" size={24} color="#10b981" />
                </View>
                <View style={styles.settingsOptionInfo}>
                  <Text style={styles.settingsOptionTitle}>Bildirimler</Text>
                  <Text style={styles.settingsOptionSubtitle}>Bildirimleri yönet</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.settingsOption, { marginTop: 8 }]}
                onPress={handleLeaveCommunity}
              >
                <View style={[styles.settingsIconWrapper, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="exit" size={24} color="#ef4444" />
                </View>
                <View style={styles.settingsOptionInfo}>
                  <Text style={[styles.settingsOptionTitle, { color: '#ef4444' }]}>Topluluktan Ayrıl</Text>
                  <Text style={styles.settingsOptionSubtitle}>Bu topluluktan çık</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duyuru Gönderme Modal */}
      <Modal visible={showAnnouncementModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.announcementModalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Duyuru</Text>
              <TouchableOpacity onPress={() => setShowAnnouncementModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <TextInput
                style={styles.announcementInput}
                placeholder="Duyuru metnini yazın..."
                placeholderTextColor="#6b7280"
                value={announcementText}
                onChangeText={setAnnouncementText}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity 
                style={[styles.sendAnnouncementBtn, sendingAnnouncement && styles.disabledBtn]}
                onPress={handleSendAnnouncement}
                disabled={sendingAnnouncement}
              >
                {sendingAnnouncement ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="megaphone" size={20} color="#fff" />
                    <Text style={styles.sendAnnouncementText}>Duyuru Gönder</Text>
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
  communityName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  locationText: {
    color: '#9ca3af',
    fontSize: 14,
    marginLeft: 4,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#6b7280',
    marginHorizontal: 8,
  },
  memberCountText: {
    color: '#9ca3af',
    fontSize: 14,
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
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 20,
    gap: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  sectionSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
    marginLeft: 46,
  },
  addButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Announcements
  announcementList: {
    gap: 10,
  },
  announcementCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  announcementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  announcementSender: {
    color: '#f59e0b',
    fontSize: 13,
    fontWeight: '600',
  },
  announcementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  announcementTime: {
    color: '#6b7280',
    fontSize: 12,
  },
  announcementContent: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },

  // Subgroups
  subgroupList: {
    gap: 10,
  },
  subgroupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  subgroupIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subgroupInfo: {
    flex: 1,
    marginLeft: 12,
  },
  subgroupName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  subgroupDescription: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  subgroupMembers: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  membershipBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  joinableBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
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

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
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
  settingsModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
  },
  announcementModalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
  settingsModalBody: {
    padding: 16,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
  },
  settingsIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsOptionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingsOptionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  settingsOptionSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  announcementInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#374151',
  },
  sendAnnouncementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
    gap: 8,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  sendAnnouncementText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
