import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { subgroupApi } from '../../../../src/services/api';
import { useAuth } from '../../../../src/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: string[] }[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
  isMultipleChoice: boolean;
}

interface PinnedMessage {
  id: string;
  content: string;
  senderName: string;
  pinnedAt: string;
}

interface Member {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  isMuted?: boolean;
}

export default function GroupMenuScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  
  // Modal states
  const [showPollModal, setShowPollModal] = useState(false);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  
  // Poll form
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [isMultipleChoice, setIsMultipleChoice] = useState(false);
  const [creatingPoll, setCreatingPoll] = useState(false);

  const isAdmin = groupInfo?.groupAdmins?.includes(user?.uid) || userProfile?.isAdmin;

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    if (!groupId) return;
    try {
      const [groupRes, pollsRes, pinnedRes] = await Promise.all([
        subgroupApi.getOne(groupId),
        subgroupApi.getPolls(groupId).catch(() => ({ data: [] })),
        subgroupApi.getPinnedMessages(groupId).catch(() => ({ data: [] })),
      ]);
      setGroupInfo(groupRes.data);
      setPolls(pollsRes.data || []);
      setPinnedMessages(pinnedRes.data || []);
    } catch (error) {
      console.error('Error loading group menu data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!groupId) return;
    try {
      const res = await subgroupApi.getMembers(groupId);
      setMembers(res.data || []);
    } catch (error) {
      console.error('Error loading members:', error);
    }
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
      const pollData = {
        question: pollQuestion.trim(),
        options: validOptions.map(text => ({ text: text.trim() })),
        isMultipleChoice,
        isAnonymous: false,
      };
      
      await subgroupApi.createPoll(groupId!, pollData);
      Alert.alert('Başarılı', 'Anket oluşturuldu');
      setShowPollModal(false);
      setPollQuestion('');
      setPollOptions(['', '']);
      setIsMultipleChoice(false);
      loadData();
    } catch (error) {
      console.error('Error creating poll:', error);
      Alert.alert('Hata', 'Anket oluşturulamadı');
    } finally {
      setCreatingPoll(false);
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    try {
      await subgroupApi.votePoll(groupId!, pollId, [optionId]);
      loadData();
    } catch (error) {
      console.error('Error voting:', error);
      Alert.alert('Hata', 'Oy verilemedi');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    Alert.alert('Anketi Sil', 'Bu anketi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await subgroupApi.deletePoll(groupId!, pollId);
            loadData();
          } catch (error) {
            Alert.alert('Hata', 'Anket silinemedi');
          }
        },
      },
    ]);
  };

  const handleMuteMember = async (userId: string, duration: number) => {
    try {
      await subgroupApi.muteMember(groupId!, userId, duration);
      Alert.alert('Başarılı', `Kullanıcı ${duration} dakika susturuldu`);
      loadMembers();
    } catch (error) {
      Alert.alert('Hata', 'İşlem başarısız');
    }
  };

  const handleKickMember = async (userId: string) => {
    Alert.alert('Kullanıcıyı At', 'Bu kullanıcıyı gruptan atmak istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'At',
        style: 'destructive',
        onPress: async () => {
          try {
            await subgroupApi.kickMember(groupId!, userId);
            Alert.alert('Başarılı', 'Kullanıcı gruptan atıldı');
            loadMembers();
          } catch (error) {
            Alert.alert('Hata', 'İşlem başarısız');
          }
        },
      },
    ]);
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{groupInfo?.name || 'Grup Menüsü'}</Text>
          <Text style={styles.headerSubtitle}>{groupInfo?.memberCount || 0} üye</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Anketler */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setShowPollModal(true)}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#6366f120' }]}>
              <Ionicons name="bar-chart" size={24} color="#6366f1" />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Anketler</Text>
              <Text style={styles.menuItemSubtitle}>{polls.length} aktif anket</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Sabitlenen Mesajlar */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => setShowPinnedModal(true)}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#f59e0b20' }]}>
              <Ionicons name="pin" size={24} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Sabitlenen Mesajlar</Text>
              <Text style={styles.menuItemSubtitle}>{pinnedMessages.length} mesaj</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Üyeler */}
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => {
            loadMembers();
            setShowMembersModal(true);
          }}
        >
          <View style={styles.menuItemLeft}>
            <View style={[styles.menuIcon, { backgroundColor: '#10b98120' }]}>
              <Ionicons name="people" size={24} color="#10b981" />
            </View>
            <View>
              <Text style={styles.menuItemTitle}>Üyeler</Text>
              <Text style={styles.menuItemSubtitle}>{groupInfo?.memberCount || 0} üye</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Admin için moderasyon */}
        {isAdmin && (
          <View style={styles.adminSection}>
            <Text style={styles.sectionTitle}>Yönetici Araçları</Text>
            
            <TouchableOpacity style={styles.adminItem}>
              <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
              <Text style={styles.adminItemText}>Grup Ayarları</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Anket Modal */}
      <Modal visible={showPollModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Anketler</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Yeni Anket Oluştur */}
              <View style={styles.createPollSection}>
                <Text style={styles.sectionLabel}>Yeni Anket Oluştur</Text>
                <TextInput
                  style={styles.pollInput}
                  placeholder="Soru"
                  placeholderTextColor="#6b7280"
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                />
                
                {pollOptions.map((option, index) => (
                  <View key={index} style={styles.optionRow}>
                    <TextInput
                      style={[styles.pollInput, { flex: 1 }]}
                      placeholder={`Seçenek ${index + 1}`}
                      placeholderTextColor="#6b7280"
                      value={option}
                      onChangeText={(text) => updatePollOption(index, text)}
                    />
                    {pollOptions.length > 2 && (
                      <TouchableOpacity 
                        onPress={() => removePollOption(index)}
                        style={styles.removeOptionBtn}
                      >
                        <Ionicons name="close-circle" size={24} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {pollOptions.length < 6 && (
                  <TouchableOpacity style={styles.addOptionBtn} onPress={addPollOption}>
                    <Ionicons name="add-circle" size={20} color="#6366f1" />
                    <Text style={styles.addOptionText}>Seçenek Ekle</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.checkboxRow}
                  onPress={() => setIsMultipleChoice(!isMultipleChoice)}
                >
                  <Ionicons 
                    name={isMultipleChoice ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color="#6366f1" 
                  />
                  <Text style={styles.checkboxLabel}>Çoklu seçim</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.createPollBtn, creatingPoll && styles.disabledBtn]}
                  onPress={handleCreatePoll}
                  disabled={creatingPoll}
                >
                  {creatingPoll ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createPollBtnText}>Anket Oluştur</Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Mevcut Anketler */}
              {polls.length > 0 && (
                <View style={styles.existingPolls}>
                  <Text style={styles.sectionLabel}>Aktif Anketler</Text>
                  {polls.map((poll) => (
                    <View key={poll.id} style={styles.pollCard}>
                      <Text style={styles.pollQuestion}>{poll.question}</Text>
                      <Text style={styles.pollMeta}>
                        {poll.createdByName} • {formatDistanceToNow(new Date(poll.createdAt), { locale: tr, addSuffix: true })}
                      </Text>
                      
                      {poll.options.map((option) => {
                        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes.length, 0);
                        const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                        const hasVoted = option.votes.includes(user?.uid || '');
                        
                        return (
                          <TouchableOpacity 
                            key={option.id}
                            style={[styles.pollOption, hasVoted && styles.pollOptionVoted]}
                            onPress={() => handleVotePoll(poll.id, option.id)}
                          >
                            <View style={[styles.pollProgress, { width: `${percentage}%` }]} />
                            <Text style={styles.pollOptionText}>{option.text}</Text>
                            <Text style={styles.pollVoteCount}>{option.votes.length}</Text>
                          </TouchableOpacity>
                        );
                      })}
                      
                      {(poll.createdBy === user?.uid || isAdmin) && (
                        <TouchableOpacity 
                          style={styles.deletePollBtn}
                          onPress={() => handleDeletePoll(poll.id)}
                        >
                          <Ionicons name="trash" size={16} color="#ef4444" />
                          <Text style={styles.deletePollText}>Anketi Sil</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Sabitlenen Mesajlar Modal */}
      <Modal visible={showPinnedModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sabitlenen Mesajlar</Text>
              <TouchableOpacity onPress={() => setShowPinnedModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {pinnedMessages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="pin-outline" size={48} color="#6b7280" />
                  <Text style={styles.emptyText}>Henüz sabitlenen mesaj yok</Text>
                </View>
              ) : (
                pinnedMessages.map((msg) => (
                  <View key={msg.id} style={styles.pinnedMessageCard}>
                    <View style={styles.pinnedIcon}>
                      <Ionicons name="pin" size={16} color="#f59e0b" />
                    </View>
                    <View style={styles.pinnedContent}>
                      <Text style={styles.pinnedSender}>{msg.senderName}</Text>
                      <Text style={styles.pinnedText}>{msg.content}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Üyeler Modal */}
      <Modal visible={showMembersModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Üyeler</Text>
              <TouchableOpacity onPress={() => setShowMembersModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={members}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={styles.memberAvatar}>
                    <Text style={styles.memberAvatarText}>
                      {item.firstName?.[0]}{item.lastName?.[0]}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
                    {item.isMuted && (
                      <Text style={styles.mutedBadge}>🔇 Susturulmuş</Text>
                    )}
                  </View>
                  {isAdmin && item.uid !== user?.uid && (
                    <View style={styles.memberActions}>
                      <TouchableOpacity 
                        style={styles.memberActionBtn}
                        onPress={() => handleMuteMember(item.uid, 30)}
                      >
                        <Ionicons name="volume-mute" size={18} color="#f59e0b" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.memberActionBtn}
                        onPress={() => handleKickMember(item.uid)}
                      >
                        <Ionicons name="exit" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color="#6b7280" />
                  <Text style={styles.emptyText}>Üye bulunamadı</Text>
                </View>
              }
            />
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuItemSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
  adminSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  adminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  adminItemText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  createPollSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  pollInput: {
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeOptionBtn: {
    marginLeft: 8,
    marginBottom: 8,
  },
  addOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  addOptionText: {
    color: '#6366f1',
    marginLeft: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  checkboxLabel: {
    color: '#fff',
    marginLeft: 8,
  },
  createPollBtn: {
    backgroundColor: '#6366f1',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  createPollBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  existingPolls: {
    marginTop: 16,
  },
  pollCard: {
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pollQuestion: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pollMeta: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 12,
  },
  pollOption: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
  },
  pollOptionVoted: {
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  pollProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#6366f130',
  },
  pollOptionText: {
    color: '#fff',
    fontSize: 14,
    zIndex: 1,
  },
  pollVoteCount: {
    color: '#9ca3af',
    fontSize: 14,
    zIndex: 1,
  },
  deletePollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#4b5563',
  },
  deletePollText: {
    color: '#ef4444',
    marginLeft: 4,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#6b7280',
    marginTop: 12,
    fontSize: 16,
  },
  pinnedMessageCard: {
    flexDirection: 'row',
    backgroundColor: '#374151',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pinnedIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  pinnedContent: {
    flex: 1,
  },
  pinnedSender: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  pinnedText: {
    color: '#fff',
    fontSize: 14,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },
  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  mutedBadge: {
    color: '#f59e0b',
    fontSize: 12,
    marginTop: 2,
  },
  memberActions: {
    flexDirection: 'row',
  },
  memberActionBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    marginLeft: 8,
  },
});
