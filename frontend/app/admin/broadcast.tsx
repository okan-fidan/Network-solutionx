import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';
import api from '../../src/services/api';
import { showToast } from '../../src/components/ui';

interface Community {
  id: string;
  name: string;
  city: string;
  memberCount: number;
  subGroupCount: number;
}

interface SubGroup {
  id: string;
  name: string;
  communityId: string;
  communityName: string;
  memberCount: number;
}

interface BroadcastStats {
  totalCommunities: number;
  totalSubgroups: number;
  totalMembers: number;
}

export default function BroadcastScreen() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [subgroups, setSubgroups] = useState<SubGroup[]>([]);
  const [stats, setStats] = useState<BroadcastStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Selection states
  const [selectedCommunities, setSelectedCommunities] = useState<Set<string>>(new Set());
  const [selectedSubgroups, setSelectedSubgroups] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [selectMode, setSelectMode] = useState<'all' | 'communities' | 'subgroups'>('all');
  
  // Message state
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendAsAnnouncement, setSendAsAnnouncement] = useState(true);
  const [sendAsMessage, setSendAsMessage] = useState(false);
  
  // History state
  const [showHistory, setShowHistory] = useState(false);
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  
  const { userProfile } = useAuth();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [commRes, subgroupsRes, historyRes] = await Promise.all([
        api.get('/api/admin/communities'),
        api.get('/api/admin/all-subgroups'),
        api.get('/api/admin/broadcast-history').catch(() => ({ data: [] })),
      ]);
      
      setCommunities(commRes.data || []);
      setSubgroups(subgroupsRes.data || []);
      setBroadcastHistory(historyRes.data || []);
      
      // Calculate stats
      const totalMembers = (commRes.data || []).reduce((sum: number, c: Community) => sum + c.memberCount, 0);
      setStats({
        totalCommunities: commRes.data?.length || 0,
        totalSubgroups: subgroupsRes.data?.length || 0,
        totalMembers,
      });
      
      // Select all by default
      setSelectedCommunities(new Set((commRes.data || []).map((c: Community) => c.id)));
      setSelectedSubgroups(new Set((subgroupsRes.data || []).map((s: SubGroup) => s.id)));
    } catch (error) {
      console.error('Error loading broadcast data:', error);
      showToast.error('Hata', 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCommunities(new Set());
      setSelectedSubgroups(new Set());
    } else {
      setSelectedCommunities(new Set(communities.map(c => c.id)));
      setSelectedSubgroups(new Set(subgroups.map(s => s.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleCommunity = (id: string) => {
    const newSet = new Set(selectedCommunities);
    if (newSet.has(id)) {
      newSet.delete(id);
      // Also remove all subgroups of this community
      const communitySubgroups = subgroups.filter(s => s.communityId === id);
      communitySubgroups.forEach(s => selectedSubgroups.delete(s.id));
      setSelectedSubgroups(new Set(selectedSubgroups));
    } else {
      newSet.add(id);
      // Also add all subgroups of this community
      const communitySubgroups = subgroups.filter(s => s.communityId === id);
      communitySubgroups.forEach(s => selectedSubgroups.add(s.id));
      setSelectedSubgroups(new Set(selectedSubgroups));
    }
    setSelectedCommunities(newSet);
    setSelectAll(false);
  };

  const toggleSubgroup = (id: string) => {
    const newSet = new Set(selectedSubgroups);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedSubgroups(newSet);
    setSelectAll(false);
  };

  const getSelectedCount = () => {
    if (selectMode === 'all') {
      return stats?.totalSubgroups || 0;
    } else if (selectMode === 'communities') {
      return selectedCommunities.size;
    } else {
      return selectedSubgroups.size;
    }
  };

  const handleSendBroadcast = async () => {
    if (!messageContent.trim()) {
      Alert.alert('Hata', 'Lütfen bir mesaj içeriği girin');
      return;
    }

    if (!sendAsAnnouncement && !sendAsMessage) {
      Alert.alert('Hata', 'En az bir gönderim tipi seçmelisiniz');
      return;
    }

    const targetGroups = selectAll 
      ? subgroups.map(s => s.id) 
      : Array.from(selectedSubgroups);

    if (targetGroups.length === 0) {
      Alert.alert('Hata', 'Lütfen en az bir grup seçin');
      return;
    }

    Alert.alert(
      'Toplu Duyuru Gönder',
      `${targetGroups.length} gruba duyuru gönderilecek. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Gönder',
          onPress: async () => {
            setSending(true);
            try {
              const response = await api.post('/api/admin/broadcast', {
                title: messageTitle.trim() || undefined,
                content: messageContent.trim(),
                targetGroups,
                sendAsAnnouncement,
                sendAsMessage,
              });

              showToast.success('Başarılı', `${response.data.sentCount} gruba duyuru gönderildi`);
              setMessageTitle('');
              setMessageContent('');
              loadData(); // Refresh history
            } catch (error: any) {
              const msg = error.response?.data?.detail || 'Duyuru gönderilemedi';
              Alert.alert('Hata', msg);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!userProfile?.isAdmin) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={64} color="#ef4444" />
          <Text style={styles.accessDeniedText}>Erişim Reddedildi</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Geri Dön</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Toplu Duyuru</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowHistory(!showHistory)}
        >
          <Ionicons name={showHistory ? "create" : "time"} size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {showHistory ? (
        // History View
        <FlatList
          data={broadcastHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="megaphone-outline" size={48} color="#374151" />
              <Text style={styles.emptyText}>Henüz duyuru gönderilmedi</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Ionicons name="megaphone" size={18} color="#f59e0b" />
                <Text style={styles.historyDate}>{formatDate(item.sentAt)}</Text>
              </View>
              {item.title && <Text style={styles.historyTitle}>{item.title}</Text>}
              <Text style={styles.historyContent} numberOfLines={3}>{item.content}</Text>
              <View style={styles.historyStats}>
                <View style={styles.historyStat}>
                  <Ionicons name="chatbubbles-outline" size={14} color="#6b7280" />
                  <Text style={styles.historyStatText}>{item.sentCount} grup</Text>
                </View>
                <View style={styles.historyStat}>
                  <Ionicons name="person-outline" size={14} color="#6b7280" />
                  <Text style={styles.historyStatText}>{item.senderName}</Text>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        // Broadcast Form
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.content}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.statIcon}>
                  <Ionicons name="business" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.statNumber}>{stats?.totalCommunities}</Text>
                <Text style={styles.statLabel}>Topluluk</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.statIcon}>
                  <Ionicons name="chatbubbles" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.statNumber}>{stats?.totalSubgroups}</Text>
                <Text style={styles.statLabel}>Grup</Text>
              </View>
              <View style={styles.statCard}>
                <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.statIcon}>
                  <Ionicons name="people" size={20} color="#fff" />
                </LinearGradient>
                <Text style={styles.statNumber}>{stats?.totalMembers}</Text>
                <Text style={styles.statLabel}>Üye</Text>
              </View>
            </View>

            {/* Target Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hedef Seçimi</Text>
                <TouchableOpacity onPress={handleSelectAll}>
                  <Text style={styles.selectAllText}>
                    {selectAll ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.selectionInfo}>
                <Ionicons 
                  name={selectAll ? "checkmark-circle" : "ellipse-outline"} 
                  size={20} 
                  color={selectAll ? "#10b981" : "#6b7280"} 
                />
                <Text style={styles.selectionText}>
                  {selectAll 
                    ? `Tüm gruplar seçili (${stats?.totalSubgroups})` 
                    : `${selectedSubgroups.size} grup seçili`}
                </Text>
              </View>

              {/* Community Quick Select */}
              <Text style={styles.subsectionTitle}>Hızlı Seçim - Topluluklar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communityScroll}>
                {communities.slice(0, 10).map((community) => {
                  const isSelected = selectedCommunities.has(community.id);
                  return (
                    <TouchableOpacity
                      key={community.id}
                      style={[styles.communityChip, isSelected && styles.communityChipSelected]}
                      onPress={() => toggleCommunity(community.id)}
                    >
                      <Text style={[styles.communityChipText, isSelected && styles.communityChipTextSelected]}>
                        {community.city}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Message Content */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Duyuru İçeriği</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Başlık (Opsiyonel)</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="Duyuru başlığı..."
                  placeholderTextColor="#6b7280"
                  value={messageTitle}
                  onChangeText={setMessageTitle}
                  maxLength={100}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mesaj *</Text>
                <TextInput
                  style={styles.contentInput}
                  placeholder="Duyuru içeriğini yazın..."
                  placeholderTextColor="#6b7280"
                  value={messageContent}
                  onChangeText={setMessageContent}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                  maxLength={1000}
                />
                <Text style={styles.charCount}>{messageContent.length}/1000</Text>
              </View>
            </View>

            {/* Send Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Gönderim Seçenekleri</Text>
              
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <View style={[styles.optionIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                    <Ionicons name="megaphone" size={20} color="#f59e0b" />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Duyuru Olarak Gönder</Text>
                    <Text style={styles.optionSubtitle}>Topluluk duyurularına ekle</Text>
                  </View>
                </View>
                <Switch
                  value={sendAsAnnouncement}
                  onValueChange={setSendAsAnnouncement}
                  trackColor={{ false: '#374151', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <View style={[styles.optionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                    <Ionicons name="chatbubble" size={20} color="#6366f1" />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Mesaj Olarak Gönder</Text>
                    <Text style={styles.optionSubtitle}>Gruplara mesaj olarak gönder</Text>
                  </View>
                </View>
                <Switch
                  value={sendAsMessage}
                  onValueChange={setSendAsMessage}
                  trackColor={{ false: '#374151', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSendBroadcast}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>
                    {selectAll ? 'Tüm Gruplara Gönder' : `${selectedSubgroups.size} Gruba Gönder`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  backBtn: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },

  content: {
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  // Section
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  selectAllText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  selectionText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  subsectionTitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 10,
    fontWeight: '500',
  },
  communityScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  communityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  communityChipSelected: {
    backgroundColor: '#6366f1',
  },
  communityChipText: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
  },
  communityChipTextSelected: {
    color: '#fff',
  },

  // Input
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  contentInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  charCount: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 6,
  },

  // Options
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  optionSubtitle: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },

  // Send Button
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#f59e0b',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // History
  historyList: {
    padding: 16,
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  historyDate: {
    color: '#6b7280',
    fontSize: 13,
  },
  historyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  historyContent: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
  },
  historyStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatText: {
    color: '#6b7280',
    fontSize: 12,
  },

  // Empty State
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
