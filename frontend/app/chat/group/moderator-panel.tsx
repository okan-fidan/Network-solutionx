import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { subgroupApi } from '../../../src/services/api';
import { useAuth } from '../../../src/contexts/AuthContext';
import Toast from 'react-native-toast-message';

interface Member {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  occupation?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
}

interface UserRole {
  role: string;
  roleName: string;
  permissions: {
    canDeleteMessages: boolean;
    canBanUsers: boolean;
    canKickUsers: boolean;
    canAddModerators: boolean;
    canRemoveModerators: boolean;
    canManageGroup: boolean;
  };
}

export default function ModeratorPanelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [moderators, setModerators] = useState<Member[]>([]);
  const [myRole, setMyRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'moderators' | 'logs'>('members');
  const [modLogs, setModLogs] = useState<any[]>([]);
  const [kickReports, setKickReports] = useState<any[]>([]);
  
  // Modal states
  const [showKickModal, setShowKickModal] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [showAddModModal, setShowAddModModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Member | null>(null);
  const [kickReason, setKickReason] = useState('');
  const [kickNotes, setKickNotes] = useState('');
  const [banReason, setBanReason] = useState('');
  const [processing, setProcessing] = useState(false);
  
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [membersRes, moderatorsRes, roleRes] = await Promise.all([
        subgroupApi.getMembers(id!),
        subgroupApi.getModerators(id!),
        subgroupApi.getMyRole(id!),
      ]);
      
      const allModerators = moderatorsRes.data || [];
      const modIds = allModerators.map((m: any) => m.uid);
      
      const enrichedMembers = (membersRes.data || []).map((m: any) => ({
        ...m,
        isModerator: modIds.includes(m.uid)
      }));
      
      setMembers(enrichedMembers);
      setModerators(allModerators);
      setMyRole(roleRes.data);
      
      // Yöneticiyse logları ve raporları da yükle
      if (roleRes.data.role === 'admin') {
        try {
          const [logsRes, reportsRes] = await Promise.all([
            subgroupApi.getModLogs(id!),
            subgroupApi.getKickReports(id!),
          ]);
          setModLogs(logsRes.data || []);
          setKickReports(reportsRes.data || []);
        } catch (e) {
          // Loglar yüklenemedi
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModerator = async (member: Member) => {
    setProcessing(true);
    try {
      await subgroupApi.addModerator(id!, member.uid);
      Toast.show({
        type: 'success',
        text1: 'Alt Yönetici Eklendi',
        text2: `${member.firstName} ${member.lastName} artık alt yönetici`,
      });
      loadData();
      setShowAddModModal(false);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'İşlem başarısız',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveModerator = async (member: Member) => {
    Alert.alert(
      'Alt Yöneticiyi Kaldır',
      `${member.firstName} ${member.lastName} adlı kullanıcının alt yönetici yetkisini kaldırmak istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaldır',
          style: 'destructive',
          onPress: async () => {
            try {
              await subgroupApi.removeModerator(id!, member.uid);
              Toast.show({
                type: 'success',
                text1: 'Alt Yönetici Kaldırıldı',
              });
              loadData();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: error.response?.data?.detail || 'İşlem başarısız',
              });
            }
          }
        }
      ]
    );
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason.trim()) {
      Alert.alert('Hata', 'Lütfen ban sebebini girin');
      return;
    }
    
    setProcessing(true);
    try {
      await subgroupApi.modBanUser(id!, selectedUser.uid, banReason.trim());
      Toast.show({
        type: 'success',
        text1: '30 Dakika Banlandı',
        text2: `${selectedUser.firstName} ${selectedUser.lastName} 30 dakika mesaj gönderemez`,
      });
      setShowBanModal(false);
      setBanReason('');
      setSelectedUser(null);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Banlama başarısız',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleKickUser = async () => {
    if (!selectedUser || !kickReason.trim()) {
      Alert.alert('Hata', 'Lütfen çıkarma sebebini girin');
      return;
    }
    
    setProcessing(true);
    try {
      await subgroupApi.modKickUser(id!, selectedUser.uid, kickReason.trim(), kickNotes.trim());
      Toast.show({
        type: 'success',
        text1: 'Üye Çıkarıldı',
        text2: 'Rapor yöneticiye gönderildi',
      });
      setShowKickModal(false);
      setKickReason('');
      setKickNotes('');
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Çıkarma başarısız',
      });
    } finally {
      setProcessing(false);
    }
  };

  const openMemberActions = (member: Member) => {
    if (!myRole) return;
    
    const isMe = member.uid === user?.uid;
    const isAdmin = member.isAdmin;
    
    if (isMe || isAdmin) return;
    
    const options: { text: string; onPress: () => void; style?: 'destructive' | 'cancel' }[] = [];
    
    if (myRole.permissions.canBanUsers) {
      options.push({
        text: '⏱️ 30 Dakika Banla',
        onPress: () => {
          setSelectedUser(member);
          setShowBanModal(true);
        }
      });
    }
    
    if (myRole.permissions.canKickUsers && !member.isModerator) {
      options.push({
        text: '🚫 Gruptan Çıkar',
        onPress: () => {
          setSelectedUser(member);
          setShowKickModal(true);
        },
        style: 'destructive'
      });
    }
    
    if (myRole.permissions.canAddModerators && !member.isModerator) {
      options.push({
        text: '🛡️ Alt Yönetici Yap',
        onPress: () => handleAddModerator(member)
      });
    }
    
    if (myRole.permissions.canRemoveModerators && member.isModerator) {
      options.push({
        text: '❌ Alt Yöneticilikten Çıkar',
        onPress: () => handleRemoveModerator(member),
        style: 'destructive'
      });
    }
    
    options.push({ text: 'İptal', onPress: () => {}, style: 'cancel' });
    
    Alert.alert(
      `${member.firstName} ${member.lastName}`,
      member.isModerator ? '🛡️ Alt Yönetici' : 'Üye',
      options
    );
  };

  const renderMember = ({ item }: { item: Member }) => (
    <TouchableOpacity 
      style={styles.memberItem}
      onPress={() => openMemberActions(item)}
      disabled={item.uid === user?.uid || item.isAdmin}
    >
      {item.profileImageUrl ? (
        <Image source={{ uri: item.profileImageUrl }} style={styles.memberAvatar} />
      ) : (
        <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
          <Ionicons name="person" size={20} color="#9ca3af" />
        </View>
      )}
      <View style={styles.memberInfo}>
        <View style={styles.memberNameRow}>
          <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
          {item.isAdmin && (
            <View style={[styles.badge, styles.adminBadge]}>
              <Text style={styles.badgeText}>Yönetici</Text>
            </View>
          )}
          {item.isModerator && !item.isAdmin && (
            <View style={[styles.badge, styles.modBadge]}>
              <Text style={styles.badgeText}>Alt Yönetici</Text>
            </View>
          )}
        </View>
        {item.occupation && (
          <Text style={styles.memberOccupation}>{item.occupation}</Text>
        )}
      </View>
      {item.uid !== user?.uid && !item.isAdmin && (
        <Ionicons name="ellipsis-vertical" size={20} color="#6b7280" />
      )}
    </TouchableOpacity>
  );

  const renderModerator = ({ item }: { item: Member }) => (
    <View style={styles.moderatorItem}>
      {item.profileImageUrl ? (
        <Image source={{ uri: item.profileImageUrl }} style={styles.memberAvatar} />
      ) : (
        <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
          <Ionicons name="person" size={20} color="#9ca3af" />
        </View>
      )}
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
        {item.occupation && (
          <Text style={styles.memberOccupation}>{item.occupation}</Text>
        )}
      </View>
      {myRole?.permissions.canRemoveModerators && (
        <TouchableOpacity 
          style={styles.removeModBtn}
          onPress={() => handleRemoveModerator(item)}
        >
          <Ionicons name="close-circle" size={24} color="#ef4444" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderLog = ({ item }: { item: any }) => (
    <View style={styles.logItem}>
      <View style={[styles.logIcon, 
        item.action === 'ban_user' ? styles.logIconBan : 
        item.action === 'kick_user' ? styles.logIconKick : 
        styles.logIconDelete
      ]}>
        <Ionicons 
          name={
            item.action === 'ban_user' ? 'time' : 
            item.action === 'kick_user' ? 'person-remove' : 
            'trash'
          } 
          size={16} 
          color="#fff" 
        />
      </View>
      <View style={styles.logInfo}>
        <Text style={styles.logText}>
          <Text style={styles.logBold}>{item.moderatorName || 'Bilinmeyen'}</Text>
          {item.action === 'ban_user' && ' bir üyeyi banladı'}
          {item.action === 'kick_user' && ' bir üyeyi çıkardı'}
          {item.action === 'delete_message' && ' bir mesaj sildi'}
        </Text>
        {item.reason && (
          <Text style={styles.logReason}>Sebep: {item.reason}</Text>
        )}
        <Text style={styles.logTime}>
          {new Date(item.timestamp).toLocaleString('tr-TR')}
        </Text>
      </View>
    </View>
  );

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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {myRole?.role === 'admin' ? 'Yönetim Paneli' : 'Alt Yönetici Paneli'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Role Badge */}
      <View style={styles.roleCard}>
        <Ionicons 
          name={myRole?.role === 'admin' ? 'shield-checkmark' : 'shield-half'} 
          size={24} 
          color={myRole?.role === 'admin' ? '#10b981' : '#f59e0b'} 
        />
        <View style={styles.roleInfo}>
          <Text style={styles.roleTitle}>{myRole?.roleName}</Text>
          <Text style={styles.roleSubtitle}>
            {myRole?.role === 'admin' 
              ? 'Tüm yetkilere sahipsiniz' 
              : 'Mesaj silme, banlama ve üye çıkarma yetkiniz var'}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'members' && styles.tabActive]}
          onPress={() => setActiveTab('members')}
        >
          <Ionicons name="people" size={18} color={activeTab === 'members' ? '#6366f1' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'members' && styles.tabTextActive]}>
            Üyeler ({members.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'moderators' && styles.tabActive]}
          onPress={() => setActiveTab('moderators')}
        >
          <Ionicons name="shield" size={18} color={activeTab === 'moderators' ? '#6366f1' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'moderators' && styles.tabTextActive]}>
            Alt Yöneticiler ({moderators.length})
          </Text>
        </TouchableOpacity>
        
        {myRole?.role === 'admin' && (
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'logs' && styles.tabActive]}
            onPress={() => setActiveTab('logs')}
          >
            <Ionicons name="document-text" size={18} color={activeTab === 'logs' ? '#6366f1' : '#6b7280'} />
            <Text style={[styles.tabText, activeTab === 'logs' && styles.tabTextActive]}>
              Loglar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {activeTab === 'members' && (
        <FlatList
          data={members}
          keyExtractor={(item) => item.uid}
          renderItem={renderMember}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Üye bulunamadı</Text>
          }
        />
      )}

      {activeTab === 'moderators' && (
        <FlatList
          data={moderators}
          keyExtractor={(item) => item.uid}
          renderItem={renderModerator}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            myRole?.permissions.canAddModerators ? (
              <TouchableOpacity 
                style={styles.addModButton}
                onPress={() => setShowAddModModal(true)}
              >
                <Ionicons name="add-circle" size={24} color="#6366f1" />
                <Text style={styles.addModButtonText}>Alt Yönetici Ekle</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Alt yönetici bulunmuyor</Text>
          }
        />
      )}

      {activeTab === 'logs' && (
        <FlatList
          data={modLogs}
          keyExtractor={(item) => item.id}
          renderItem={renderLog}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Henüz moderasyon logu yok</Text>
          }
        />
      )}

      {/* Ban Modal */}
      <Modal visible={showBanModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⏱️ 30 Dakika Banla</Text>
              <TouchableOpacity onPress={() => setShowBanModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedUser?.firstName} {selectedUser?.lastName}
            </Text>
            <Text style={styles.inputLabel}>Ban Sebebi *</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Spam, hakaret, reklam..."
              placeholderTextColor="#6b7280"
              value={banReason}
              onChangeText={setBanReason}
              multiline
            />
            <TouchableOpacity 
              style={[styles.actionButton, styles.banButton, !banReason.trim() && styles.buttonDisabled]}
              onPress={handleBanUser}
              disabled={processing || !banReason.trim()}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>30 Dakika Banla</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Kick Modal */}
      <Modal visible={showKickModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🚫 Üyeyi Çıkar</Text>
              <TouchableOpacity onPress={() => setShowKickModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedUser?.firstName} {selectedUser?.lastName}
            </Text>
            
            <Text style={styles.inputLabel}>Çıkarma Sebebi * (Yöneticiye gönderilecek)</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Sürekli spam yapıyor..."
              placeholderTextColor="#6b7280"
              value={kickReason}
              onChangeText={setKickReason}
              multiline
            />
            
            <Text style={styles.inputLabel}>Ek Notlar (Opsiyonel)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Eklemek istediğiniz detaylar..."
              placeholderTextColor="#6b7280"
              value={kickNotes}
              onChangeText={setKickNotes}
              multiline
            />
            
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text style={styles.infoText}>
                Bu rapor yöneticiye gönderilecektir. Yönetici çıkarma sebebini inceleyecektir.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.actionButton, styles.kickButton, !kickReason.trim() && styles.buttonDisabled]}
              onPress={handleKickUser}
              disabled={processing || !kickReason.trim()}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Gruptan Çıkar ve Rapor Gönder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Moderator Modal */}
      <Modal visible={showAddModModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🛡️ Alt Yönetici Ekle</Text>
              <TouchableOpacity onPress={() => setShowAddModModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members.filter(m => !m.isAdmin && !m.isModerator && m.uid !== user?.uid)}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.selectMemberItem}
                  onPress={() => {
                    Alert.alert(
                      'Alt Yönetici Ekle',
                      `${item.firstName} ${item.lastName} alt yönetici yapılsın mı?\n\nYetkileri:\n• Mesaj silme\n• 30 dakika banlama\n• Üye çıkarma (yöneticiler hariç)`,
                      [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Ekle', onPress: () => handleAddModerator(item) }
                      ]
                    );
                  }}
                >
                  {item.profileImageUrl ? (
                    <Image source={{ uri: item.profileImageUrl }} style={styles.memberAvatar} />
                  ) : (
                    <View style={[styles.memberAvatar, styles.memberAvatarPlaceholder]}>
                      <Ionicons name="person" size={20} color="#9ca3af" />
                    </View>
                  )}
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.firstName} {item.lastName}</Text>
                    {item.occupation && (
                      <Text style={styles.memberOccupation}>{item.occupation}</Text>
                    )}
                  </View>
                  <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Eklenebilecek üye yok</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', margin: 16, padding: 16, borderRadius: 12, gap: 12 },
  roleInfo: { flex: 1 },
  roleTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  roleSubtitle: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#6b7280', fontSize: 13 },
  tabTextActive: { color: '#6366f1', fontWeight: '600' },
  
  listContent: { padding: 16 },
  memberItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', padding: 14, borderRadius: 12, marginBottom: 10 },
  memberAvatar: { width: 44, height: 44, borderRadius: 22 },
  memberAvatarPlaceholder: { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  memberOccupation: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  adminBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  modBadge: { backgroundColor: 'rgba(245, 158, 11, 0.2)' },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#f59e0b' },
  
  moderatorItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', padding: 14, borderRadius: 12, marginBottom: 10 },
  removeModBtn: { padding: 4 },
  
  addModButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: 14, borderRadius: 12, marginBottom: 16, gap: 8 },
  addModButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  
  logItem: { flexDirection: 'row', backgroundColor: '#1f2937', padding: 14, borderRadius: 12, marginBottom: 10 },
  logIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logIconBan: { backgroundColor: '#f59e0b' },
  logIconKick: { backgroundColor: '#ef4444' },
  logIconDelete: { backgroundColor: '#6b7280' },
  logInfo: { flex: 1 },
  logText: { color: '#fff', fontSize: 14 },
  logBold: { fontWeight: '600' },
  logReason: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  logTime: { color: '#6b7280', fontSize: 12, marginTop: 4 },
  
  emptyText: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  modalSubtitle: { color: '#9ca3af', fontSize: 14, marginBottom: 20 },
  
  inputLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, minHeight: 50 },
  
  actionButton: { paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  banButton: { backgroundColor: '#f59e0b' },
  kickButton: { backgroundColor: '#ef4444' },
  buttonDisabled: { opacity: 0.5 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  infoBox: { flexDirection: 'row', backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: 12, borderRadius: 10, marginTop: 16, gap: 10 },
  infoText: { color: '#9ca3af', fontSize: 13, flex: 1 },
  
  selectMemberItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
});
