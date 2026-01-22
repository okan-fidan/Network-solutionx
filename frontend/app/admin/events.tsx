import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

const CITIES = [
  'İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Gaziantep',
  'Mersin', 'Diyarbakır', 'Kayseri', 'Eskişehir', 'Samsun', 'Denizli', 'Şanlıurfa'
];

export default function AdminEventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('19:00');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [isOnline, setIsOnline] = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [maxAttendees, setMaxAttendees] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await api.get('/api/admin/events');
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!title.trim() || !description.trim() || !location.trim()) {
      Alert.alert('Hata', 'Başlık, açıklama ve konum zorunludur');
      return;
    }

    setCreating(true);
    try {
      const eventData = {
        title: title.trim(),
        description: description.trim(),
        date: date.toISOString().split('T')[0],
        time,
        location: location.trim(),
        city,
        isOnline,
        meetingLink: isOnline ? meetingLink.trim() : null,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
      };

      await api.post('/api/admin/events', eventData);
      
      Toast.show({
        type: 'success',
        text1: 'Başarılı',
        text2: 'Etkinlik oluşturuldu',
      });
      
      setShowCreateModal(false);
      resetForm();
      loadEvents();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Etkinlik oluşturulamadı',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteEvent = (eventId: string, eventTitle: string) => {
    Alert.alert(
      'Etkinliği Sil',
      `"${eventTitle}" etkinliğini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/events/${eventId}`);
              Toast.show({
                type: 'success',
                text1: 'Başarılı',
                text2: 'Etkinlik silindi',
              });
              loadEvents();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: 'Etkinlik silinemedi',
              });
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date());
    setTime('19:00');
    setLocation('');
    setCity('İstanbul');
    setIsOnline(false);
    setMeetingLink('');
    setMaxAttendees('');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderEvent = ({ item }: { item: any }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.eventBadge, item.isOnline ? styles.onlineBadge : styles.offlineBadge]}>
          <Ionicons name={item.isOnline ? 'videocam' : 'location'} size={14} color="#fff" />
          <Text style={styles.eventBadgeText}>{item.isOnline ? 'Online' : 'Yüz Yüze'}</Text>
        </View>
        <TouchableOpacity 
          style={styles.deleteButton}
          onPress={() => handleDeleteEvent(item.id, item.title)}
        >
          <Ionicons name="trash-outline" size={20} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={styles.eventTitle}>{item.title}</Text>
      <Text style={styles.eventDescription} numberOfLines={2}>{item.description}</Text>

      <View style={styles.eventMeta}>
        <View style={styles.eventMetaItem}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.eventMetaText}>{formatDate(item.date)} - {item.time}</Text>
        </View>
        <View style={styles.eventMetaItem}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.eventMetaText}>{item.city || item.location}</Text>
        </View>
        <View style={styles.eventMetaItem}>
          <Ionicons name="people-outline" size={16} color="#6b7280" />
          <Text style={styles.eventMetaText}>
            {item.attendeeCount || 0} katılımcı
            {item.maxAttendees && ` / ${item.maxAttendees} max`}
          </Text>
        </View>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Etkinlik Yönetimi</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={28} color="#10b981" />
        </TouchableOpacity>
      </View>

      {events.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color="#374151" />
          <Text style={styles.emptyText}>Henüz etkinlik yok</Text>
          <Text style={styles.emptySubtext}>Yeni etkinlik oluşturmak için + butonuna tıklayın</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          renderItem={renderEvent}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.eventsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create Event Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Etkinlik</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Etkinlik Başlığı *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Örn: İstanbul Girişimci Buluşması"
                  placeholderTextColor="#6b7280"
                  maxLength={200}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Açıklama *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Etkinlik hakkında detaylı bilgi..."
                  placeholderTextColor="#6b7280"
                  multiline
                  maxLength={2000}
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Tarih *</Text>
                  <TouchableOpacity 
                    style={styles.input}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={styles.inputText}>{date.toLocaleDateString('tr-TR')}</Text>
                  </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>Saat *</Text>
                  <TextInput
                    style={styles.input}
                    value={time}
                    onChangeText={setTime}
                    placeholder="19:00"
                    placeholderTextColor="#6b7280"
                  />
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                  minimumDate={new Date()}
                />
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Şehir *</Text>
                <TouchableOpacity 
                  style={styles.input}
                  onPress={() => setShowCityPicker(true)}
                >
                  <Text style={styles.inputText}>{city}</Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Konum/Adres *</Text>
                <TextInput
                  style={styles.input}
                  value={location}
                  onChangeText={setLocation}
                  placeholder="Etkinlik adresi veya mekan adı"
                  placeholderTextColor="#6b7280"
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.label}>Online Etkinlik</Text>
                <TouchableOpacity 
                  style={[styles.switch, isOnline && styles.switchActive]}
                  onPress={() => setIsOnline(!isOnline)}
                >
                  <View style={[styles.switchThumb, isOnline && styles.switchThumbActive]} />
                </TouchableOpacity>
              </View>

              {isOnline && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Toplantı Linki</Text>
                  <TextInput
                    style={styles.input}
                    value={meetingLink}
                    onChangeText={setMeetingLink}
                    placeholder="https://zoom.us/..."
                    placeholderTextColor="#6b7280"
                    autoCapitalize="none"
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Max Katılımcı (Opsiyonel)</Text>
                <TextInput
                  style={styles.input}
                  value={maxAttendees}
                  onChangeText={setMaxAttendees}
                  placeholder="Örn: 50"
                  placeholderTextColor="#6b7280"
                  keyboardType="numeric"
                />
              </View>

              <TouchableOpacity 
                style={[styles.createButton, creating && styles.buttonDisabled]}
                onPress={handleCreateEvent}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={22} color="#fff" />
                    <Text style={styles.createButtonText}>Etkinlik Oluştur</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Şehir Seçin</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CITIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityItem, city === item && styles.cityItemSelected]}
                  onPress={() => {
                    setCity(item);
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.cityText, city === item && styles.cityTextSelected]}>{item}</Text>
                  {city === item && <Ionicons name="checkmark" size={20} color="#10b981" />}
                </TouchableOpacity>
              )}
              contentContainerStyle={{ padding: 16 }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtext: { color: '#6b7280', fontSize: 14, textAlign: 'center', marginTop: 8 },
  eventsList: { padding: 16 },
  eventCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eventBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  onlineBadge: { backgroundColor: '#6366f1' },
  offlineBadge: { backgroundColor: '#10b981' },
  eventBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteButton: { padding: 8 },
  eventTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 8 },
  eventDescription: { color: '#9ca3af', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  eventMeta: { gap: 8 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eventMetaText: { color: '#6b7280', fontSize: 13 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  modalContent: { padding: 16 },
  
  inputGroup: { marginBottom: 20 },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  inputText: { color: '#fff', fontSize: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  switch: { width: 52, height: 32, borderRadius: 16, backgroundColor: '#374151', padding: 2 },
  switchActive: { backgroundColor: '#10b981' },
  switchThumb: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff' },
  switchThumbActive: { transform: [{ translateX: 20 }] },
  
  createButton: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 32 },
  buttonDisabled: { backgroundColor: '#374151' },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  cityItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4 },
  cityItemSelected: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  cityText: { color: '#9ca3af', fontSize: 16 },
  cityTextSelected: { color: '#10b981', fontWeight: '600' },
});
