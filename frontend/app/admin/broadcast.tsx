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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
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

interface Template {
  id: string;
  name: string;
  title: string;
  content: string;
  icon: string;
  color: string;
}

// Hazır duyuru şablonları
const TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Hoş Geldiniz',
    title: '🎉 Topluluğumuza Hoş Geldiniz!',
    content: 'Değerli girişimciler, topluluğumuza hoş geldiniz! Burada birlikte büyüyecek, öğrenecek ve başarıya ulaşacağız. Kendinizi tanıtmayı unutmayın!',
    icon: 'happy',
    color: '#10b981',
  },
  {
    id: '2',
    name: 'Etkinlik Duyurusu',
    title: '📅 Yaklaşan Etkinlik',
    content: 'Değerli üyelerimiz,\n\n[ETKİNLİK ADI] etkinliğimiz [TARİH] tarihinde [SAAT] saatinde gerçekleşecektir.\n\n📍 Yer: [KONUM]\n\nKatılımınızı bekliyoruz!',
    icon: 'calendar',
    color: '#6366f1',
  },
  {
    id: '3',
    name: 'Önemli Duyuru',
    title: '⚠️ Önemli Duyuru',
    content: 'Değerli üyelerimiz,\n\nDikkatinize sunmak istediğimiz önemli bir güncelleme bulunmaktadır:\n\n[DUYURU İÇERİĞİ]\n\nSorularınız için bizimle iletişime geçebilirsiniz.',
    icon: 'alert-circle',
    color: '#f59e0b',
  },
  {
    id: '4',
    name: 'Haftalık Özet',
    title: '📊 Bu Hafta Neler Oldu?',
    content: 'Merhaba değerli girişimciler!\n\nBu hafta topluluğumuzda:\n\n✅ [BAŞARI 1]\n✅ [BAŞARI 2]\n✅ [BAŞARI 3]\n\nHaftaya görüşmek üzere!',
    icon: 'trending-up',
    color: '#3b82f6',
  },
  {
    id: '5',
    name: 'Networking',
    title: '🤝 Networking Fırsatı',
    content: 'Değerli girişimciler,\n\nBu hafta networking etkinliğimiz var!\n\nBirbirinizle tanışın, işbirlikleri kurun ve ağınızı genişletin.\n\nDetaylar için DM atın!',
    icon: 'people',
    color: '#8b5cf6',
  },
  {
    id: '6',
    name: 'Başarı Hikayesi',
    title: '🏆 Başarı Hikayesi',
    content: 'Topluluğumuzdan harika bir başarı hikayesi!\n\n[ÜYE ADI] arkadaşımız [BAŞARI DETAYI] başardı!\n\nTebrikler! 🎊\n\nBu ilham verici hikayeyi sizlerle paylaşmak istedik.',
    icon: 'trophy',
    color: '#eab308',
  },
];

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
  
  // Message state
  const [messageTitle, setMessageTitle] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendAsAnnouncement, setSendAsAnnouncement] = useState(true);
  const [sendAsMessage, setSendAsMessage] = useState(false);
  const [sendPushNotification, setSendPushNotification] = useState(true);
  
  // Schedule state
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // Modal states
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'scheduled' | 'history'>('compose');
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  
  // History & Scheduled
  const [broadcastHistory, setBroadcastHistory] = useState<any[]>([]);
  const [scheduledBroadcasts, setScheduledBroadcasts] = useState<any[]>([]);
  
  const { userProfile } = useAuth();
  const router = useRouter();

  const loadData = useCallback(async () => {
    try {
      const [commRes, subgroupsRes, historyRes, scheduledRes] = await Promise.all([
        api.get('/api/admin/communities'),
        api.get('/api/admin/all-subgroups'),
        api.get('/api/admin/broadcast-history').catch(() => ({ data: [] })),
        api.get('/api/admin/scheduled-broadcasts').catch(() => ({ data: [] })),
      ]);
      
      setCommunities(commRes.data || []);
      setSubgroups(subgroupsRes.data || []);
      setBroadcastHistory(historyRes.data || []);
      setScheduledBroadcasts(scheduledRes.data || []);
      
      const totalMembers = (commRes.data || []).reduce((sum: number, c: Community) => sum + c.memberCount, 0);
      setStats({
        totalCommunities: commRes.data?.length || 0,
        totalSubgroups: subgroupsRes.data?.length || 0,
        totalMembers,
      });
      
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
      const communitySubgroups = subgroups.filter(s => s.communityId === id);
      communitySubgroups.forEach(s => selectedSubgroups.delete(s.id));
      setSelectedSubgroups(new Set(selectedSubgroups));
    } else {
      newSet.add(id);
      const communitySubgroups = subgroups.filter(s => s.communityId === id);
      communitySubgroups.forEach(s => selectedSubgroups.add(s.id));
      setSelectedSubgroups(new Set(selectedSubgroups));
    }
    setSelectedCommunities(newSet);
    setSelectAll(false);
  };

  const applyTemplate = (template: Template) => {
    setMessageTitle(template.title);
    setMessageContent(template.content);
    setShowTemplateModal(false);
    showToast.success('Şablon Uygulandı', template.name);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(scheduledDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setScheduledDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(scheduledDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setScheduledDate(newDate);
    }
  };

  const handleSendBroadcast = async () => {
    if (!messageContent.trim()) {
      Alert.alert('Hata', 'Lütfen bir mesaj içeriği girin');
      return;
    }

    if (!sendAsAnnouncement && !sendAsMessage && !sendPushNotification) {
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

    const actionText = isScheduled ? 'zamanlanacak' : 'gönderilecek';
    const confirmText = isScheduled 
      ? `${targetGroups.length} gruba ${formatDateTime(scheduledDate)} tarihinde duyuru gönderilecek.`
      : `${targetGroups.length} gruba duyuru gönderilecek.`;

    Alert.alert(
      isScheduled ? 'Duyuru Zamanla' : 'Toplu Duyuru Gönder',
      `${confirmText} Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: isScheduled ? 'Zamanla' : 'Gönder',
          onPress: async () => {
            setSending(true);
            try {
              const endpoint = isScheduled ? '/api/admin/schedule-broadcast' : '/api/admin/broadcast';
              const response = await api.post(endpoint, {
                title: messageTitle.trim() || undefined,
                content: messageContent.trim(),
                targetGroups,
                sendAsAnnouncement,
                sendAsMessage,
                sendPushNotification,
                scheduledAt: isScheduled ? scheduledDate.toISOString() : undefined,
              });

              const successMsg = isScheduled 
                ? `Duyuru ${formatDateTime(scheduledDate)} için zamanlandı`
                : `${response.data.sentCount} gruba duyuru gönderildi`;
              
              showToast.success('Başarılı', successMsg);
              setMessageTitle('');
              setMessageContent('');
              setIsScheduled(false);
              loadData();
            } catch (error: any) {
              const msg = error.response?.data?.detail || 'İşlem başarısız';
              Alert.alert('Hata', msg);
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelScheduled = async (broadcastId: string) => {
    Alert.alert(
      'Zamanlanmış Duyuruyu İptal Et',
      'Bu duyuruyu iptal etmek istediğinize emin misiniz?',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/scheduled-broadcasts/${broadcastId}`);
              showToast.success('İptal Edildi', 'Zamanlanmış duyuru iptal edildi');
              loadData();
            } catch (error) {
              showToast.error('Hata', 'İptal işlemi başarısız');
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

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
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
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {[
          { key: 'compose', icon: 'create', label: 'Oluştur' },
          { key: 'templates', icon: 'documents', label: 'Şablonlar' },
          { key: 'scheduled', icon: 'time', label: 'Zamanlanmış' },
          { key: 'history', icon: 'archive', label: 'Geçmiş' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key as any)}
          >
            <Ionicons
              name={tab.icon as any}
              size={18}
              color={activeTab === tab.key ? '#6366f1' : '#6b7280'}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
              {tab.label}
            </Text>
            {tab.key === 'scheduled' && scheduledBroadcasts.length > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{scheduledBroadcasts.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {activeTab === 'compose' && (
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

              <Text style={styles.subsectionTitle}>Hızlı Seçim - Topluluklar</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.communityScroll}>
                {communities.slice(0, 15).map((community) => {
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
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Quick Templates */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Hızlı Şablon</Text>
                <TouchableOpacity onPress={() => setActiveTab('templates')}>
                  <Text style={styles.selectAllText}>Tümünü Gör</Text>
                </TouchableOpacity>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {TEMPLATES.slice(0, 4).map((template) => (
                  <TouchableOpacity
                    key={template.id}
                    style={[styles.quickTemplateCard, { borderColor: template.color }]}
                    onPress={() => applyTemplate(template)}
                  >
                    <View style={[styles.quickTemplateIcon, { backgroundColor: `${template.color}20` }]}>
                      <Ionicons name={template.icon as any} size={20} color={template.color} />
                    </View>
                    <Text style={styles.quickTemplateName}>{template.name}</Text>
                  </TouchableOpacity>
                ))}
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
                    <Text style={styles.optionTitle}>Duyuru Olarak</Text>
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
                    <Text style={styles.optionTitle}>Mesaj Olarak</Text>
                    <Text style={styles.optionSubtitle}>Gruplara mesaj gönder</Text>
                  </View>
                </View>
                <Switch
                  value={sendAsMessage}
                  onValueChange={setSendAsMessage}
                  trackColor={{ false: '#374151', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>

              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <View style={[styles.optionIcon, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons name="notifications" size={20} color="#ef4444" />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>Push Bildirim</Text>
                    <Text style={styles.optionSubtitle}>Telefona bildirim gönder</Text>
                  </View>
                </View>
                <Switch
                  value={sendPushNotification}
                  onValueChange={setSendPushNotification}
                  trackColor={{ false: '#374151', true: '#6366f1' }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            {/* Schedule Option */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Zamanlama</Text>
              
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <View style={[styles.optionIcon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                    <Ionicons name="time" size={20} color="#8b5cf6" />
                  </View>
                  <View>
                    <Text style={styles.optionTitle}>İleri Tarihli Gönder</Text>
                    <Text style={styles.optionSubtitle}>Belirli bir zamanda gönder</Text>
                  </View>
                </View>
                <Switch
                  value={isScheduled}
                  onValueChange={setIsScheduled}
                  trackColor={{ false: '#374151', true: '#8b5cf6' }}
                  thumbColor="#fff"
                />
              </View>

              {isScheduled && (
                <View style={styles.schedulePickers}>
                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Ionicons name="calendar" size={20} color="#8b5cf6" />
                    <Text style={styles.datePickerText}>
                      {scheduledDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.datePickerBtn}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Ionicons name="time" size={20} color="#8b5cf6" />
                    <Text style={styles.datePickerText}>
                      {scheduledDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={scheduledDate}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={[
                styles.sendButton, 
                sending && styles.sendButtonDisabled,
                isScheduled && styles.scheduleButton
              ]}
              onPress={handleSendBroadcast}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={isScheduled ? "time" : "send"} size={20} color="#fff" />
                  <Text style={styles.sendButtonText}>
                    {isScheduled 
                      ? 'Duyuruyu Zamanla' 
                      : selectAll 
                        ? 'Tüm Gruplara Gönder' 
                        : `${selectedSubgroups.size} Gruba Gönder`}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <FlatList
          data={TEMPLATES}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.templatesList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.templateCard, { borderLeftColor: item.color }]}
              onPress={() => {
                applyTemplate(item);
                setActiveTab('compose');
              }}
            >
              <View style={styles.templateHeader}>
                <View style={[styles.templateIconWrapper, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{item.name}</Text>
                  <Text style={styles.templateTitle}>{item.title}</Text>
                </View>
              </View>
              <Text style={styles.templateContent} numberOfLines={3}>{item.content}</Text>
              <TouchableOpacity 
                style={[styles.useTemplateBtn, { backgroundColor: item.color }]}
                onPress={() => {
                  applyTemplate(item);
                  setActiveTab('compose');
                }}
              >
                <Text style={styles.useTemplateBtnText}>Şablonu Kullan</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <FlatList
          data={scheduledBroadcasts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="time-outline" size={48} color="#374151" />
              </View>
              <Text style={styles.emptyText}>Zamanlanmış duyuru yok</Text>
              <Text style={styles.emptySubtext}>İleri tarihli duyurular burada görünür</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.scheduledCard}>
              <View style={styles.scheduledHeader}>
                <View style={styles.scheduledTime}>
                  <Ionicons name="time" size={18} color="#8b5cf6" />
                  <Text style={styles.scheduledTimeText}>{formatDate(item.scheduledAt)}</Text>
                </View>
                <TouchableOpacity onPress={() => handleCancelScheduled(item.id)}>
                  <Ionicons name="close-circle" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
              {item.title && <Text style={styles.scheduledTitle}>{item.title}</Text>}
              <Text style={styles.scheduledContent} numberOfLines={2}>{item.content}</Text>
              <View style={styles.scheduledMeta}>
                <Ionicons name="chatbubbles-outline" size={14} color="#6b7280" />
                <Text style={styles.scheduledMetaText}>{item.targetGroups?.length || 0} grup</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <FlatList
          data={broadcastHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.historyList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrapper}>
                <Ionicons name="megaphone-outline" size={48} color="#374151" />
              </View>
              <Text style={styles.emptyText}>Henüz duyuru gönderilmedi</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View style={styles.historyIconWrapper}>
                  <Ionicons name="megaphone" size={16} color="#f59e0b" />
                </View>
                <Text style={styles.historyDate}>{formatDate(item.sentAt)}</Text>
                {item.sendPushNotification && (
                  <View style={styles.pushBadge}>
                    <Ionicons name="notifications" size={10} color="#fff" />
                  </View>
                )}
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6366f1',
  },
  tabBadge: {
    backgroundColor: '#8b5cf6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 18,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
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

  // Quick Templates
  quickTemplateCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginRight: 12,
    alignItems: 'center',
    borderWidth: 1,
    width: 100,
  },
  quickTemplateIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickTemplateName: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
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

  // Schedule
  schedulePickers: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#8b5cf6',
  },
  datePickerText: {
    color: '#fff',
    fontSize: 14,
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
  scheduleButton: {
    backgroundColor: '#8b5cf6',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Templates List
  templatesList: {
    padding: 16,
  },
  templateCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  templateIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '500',
  },
  templateTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  templateContent: {
    color: '#d1d5db',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  useTemplateBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  useTemplateBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Scheduled
  scheduledCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8b5cf6',
  },
  scheduledHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduledTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scheduledTimeText: {
    color: '#8b5cf6',
    fontSize: 14,
    fontWeight: '500',
  },
  scheduledTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  scheduledContent: {
    color: '#d1d5db',
    fontSize: 14,
  },
  scheduledMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  scheduledMetaText: {
    color: '#6b7280',
    fontSize: 12,
  },

  // History
  historyList: {
    padding: 16,
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
  historyIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDate: {
    color: '#6b7280',
    fontSize: 13,
    flex: 1,
  },
  pushBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    padding: 4,
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
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    color: '#6b7280',
    fontSize: 14,
    marginTop: 4,
  },
});
