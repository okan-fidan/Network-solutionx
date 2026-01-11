import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/services/api';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  communityId: string;
  communityName: string;
  createdBy: string;
  createdByName: string;
  attendees: string[];
  maxAttendees?: number;
  isOnline: boolean;
  meetingLink?: string;
}

const MONTHS_TR = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAYS_TR = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];

export default function EventsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { communityId } = useLocalSearchParams<{ communityId?: string }>();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Create event form
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    time: '19:00',
    location: '',
    isOnline: false,
    meetingLink: '',
    maxAttendees: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadEvents();
  }, [communityId]);

  const loadEvents = async () => {
    try {
      // Demo events for now
      const demoEvents: Event[] = [
        {
          id: '1',
          title: 'Girişimcilik Buluşması',
          description: 'Aylık networking etkinliğimiz',
          date: new Date().toISOString().split('T')[0],
          time: '19:00',
          location: 'İstanbul, Levent',
          communityId: 'demo-1',
          communityName: 'İstanbul Girişimciler',
          createdBy: 'admin',
          createdByName: 'Admin',
          attendees: ['user1', 'user2', 'user3'],
          maxAttendees: 50,
          isOnline: false,
        },
        {
          id: '2',
          title: 'Online Workshop: Startup Finansmanı',
          description: 'Yatırım alma süreçleri hakkında bilgilendirme',
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '20:00',
          location: 'Online',
          communityId: 'demo-1',
          communityName: 'İstanbul Girişimciler',
          createdBy: 'admin',
          createdByName: 'Admin',
          attendees: ['user1', 'user2'],
          isOnline: true,
          meetingLink: 'https://meet.google.com/xxx',
        },
        {
          id: '3',
          title: 'Tech Meetup',
          description: 'Yazılım geliştirme trendleri',
          date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          time: '18:30',
          location: 'Ankara, Çankaya',
          communityId: 'demo-2',
          communityName: 'Ankara Tech',
          createdBy: 'admin',
          createdByName: 'Admin',
          attendees: [],
          maxAttendees: 30,
          isOnline: false,
        },
      ];
      setEvents(demoEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      Alert.alert('Hata', 'Lütfen başlık ve tarih girin');
      return;
    }

    setCreating(true);
    try {
      // API call would go here
      Alert.alert('Başarılı', 'Etkinlik oluşturuldu');
      setShowCreateModal(false);
      setNewEvent({
        title: '',
        description: '',
        date: '',
        time: '19:00',
        location: '',
        isOnline: false,
        meetingLink: '',
        maxAttendees: '',
      });
      loadEvents();
    } catch (error) {
      Alert.alert('Hata', 'Etkinlik oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    try {
      // API call would go here
      setEvents(events.map(e => 
        e.id === eventId 
          ? { ...e, attendees: [...e.attendees, user?.uid || ''] }
          : e
      ));
      Alert.alert('Başarılı', 'Etkinliğe katıldınız');
    } catch (error) {
      Alert.alert('Hata', 'Katılım işlemi başarısız');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty days for alignment
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add actual days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const hasEventOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.some(e => e.date === dateStr);
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(e => e.date === dateStr);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate()} ${MONTHS_TR[date.getMonth()]}`;
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);

    return (
      <View style={styles.calendar}>
        {/* Month Navigation */}
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() - 1);
            setCurrentMonth(newDate);
          }}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTHS_TR[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </Text>
          <TouchableOpacity onPress={() => {
            const newDate = new Date(currentMonth);
            newDate.setMonth(newDate.getMonth() + 1);
            setCurrentMonth(newDate);
          }}>
            <Ionicons name="chevron-forward" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Day Names */}
        <View style={styles.dayNames}>
          {DAYS_TR.map(day => (
            <Text key={day} style={styles.dayName}>{day}</Text>
          ))}
        </View>

        {/* Days Grid */}
        <View style={styles.daysGrid}>
          {days.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = day.toDateString() === selectedDate.toDateString();
            const hasEvent = hasEventOnDate(day);

            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && styles.dayCellToday,
                ]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[
                  styles.dayText,
                  isSelected && styles.dayTextSelected,
                  isToday && styles.dayTextToday,
                ]}>
                  {day.getDate()}
                </Text>
                {hasEvent && <View style={styles.eventDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  const renderEventCard = ({ item }: { item: Event }) => {
    const isJoined = item.attendees.includes(user?.uid || '');
    const isFull = item.maxAttendees && item.attendees.length >= item.maxAttendees;

    return (
      <View style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={styles.eventDateBadge}>
            <Text style={styles.eventDateDay}>
              {new Date(item.date).getDate()}
            </Text>
            <Text style={styles.eventDateMonth}>
              {MONTHS_TR[new Date(item.date).getMonth()].substring(0, 3)}
            </Text>
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.eventCommunity}>{item.communityName}</Text>
          </View>
          {item.isOnline && (
            <View style={styles.onlineBadge}>
              <Ionicons name="videocam" size={14} color="#10b981" />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          )}
        </View>

        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.eventMeta}>
          <View style={styles.eventMetaItem}>
            <Ionicons name="time-outline" size={16} color="#6b7280" />
            <Text style={styles.eventMetaText}>{item.time}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="location-outline" size={16} color="#6b7280" />
            <Text style={styles.eventMetaText}>{item.location}</Text>
          </View>
          <View style={styles.eventMetaItem}>
            <Ionicons name="people-outline" size={16} color="#6b7280" />
            <Text style={styles.eventMetaText}>
              {item.attendees.length}{item.maxAttendees ? `/${item.maxAttendees}` : ''} katılımcı
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.joinButton,
            isJoined && styles.joinedButton,
            isFull && !isJoined && styles.fullButton,
          ]}
          onPress={() => handleJoinEvent(item.id)}
          disabled={isFull && !isJoined}
        >
          <Text style={[styles.joinButtonText, isJoined && styles.joinedButtonText]}>
            {isJoined ? 'Katıldın ✓' : isFull ? 'Dolu' : 'Katıl'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Etkinlikler</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Calendar */}
        {renderCalendar()}

        {/* Selected Date Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>
            {selectedDate.toDateString() === new Date().toDateString() 
              ? 'Bugün' 
              : formatDate(selectedDate.toISOString())}
          </Text>

          {loading ? (
            <ActivityIndicator color="#6366f1" />
          ) : selectedDateEvents.length > 0 ? (
            selectedDateEvents.map(event => (
              <View key={event.id}>
                {renderEventCard({ item: event })}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#374151" />
              <Text style={styles.emptyText}>Bu tarihte etkinlik yok</Text>
            </View>
          )}
        </View>

        {/* Upcoming Events */}
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Yaklaşan Etkinlikler</Text>
          {events
            .filter(e => new Date(e.date) >= new Date())
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(0, 5)
            .map(event => (
              <View key={event.id}>
                {renderEventCard({ item: event })}
              </View>
            ))
          }
        </View>
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Etkinlik</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TextInput
                style={styles.input}
                placeholder="Etkinlik Başlığı"
                placeholderTextColor="#6b7280"
                value={newEvent.title}
                onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Açıklama"
                placeholderTextColor="#6b7280"
                value={newEvent.description}
                onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                multiline
                numberOfLines={3}
              />

              <TextInput
                style={styles.input}
                placeholder="Tarih (YYYY-MM-DD)"
                placeholderTextColor="#6b7280"
                value={newEvent.date}
                onChangeText={(text) => setNewEvent({ ...newEvent, date: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Saat (HH:MM)"
                placeholderTextColor="#6b7280"
                value={newEvent.time}
                onChangeText={(text) => setNewEvent({ ...newEvent, time: text })}
              />

              <TextInput
                style={styles.input}
                placeholder="Konum"
                placeholderTextColor="#6b7280"
                value={newEvent.location}
                onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
              />

              <TouchableOpacity
                style={[styles.createButton, creating && styles.disabledButton]}
                onPress={handleCreateEvent}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.createButtonText}>Etkinlik Oluştur</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#6366f1', borderRadius: 20 },
  content: { flex: 1 },
  calendar: { backgroundColor: '#111827', margin: 16, borderRadius: 16, padding: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  monthTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  dayNames: { flexDirection: 'row', marginBottom: 8 },
  dayName: { flex: 1, textAlign: 'center', color: '#6b7280', fontSize: 12, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.28%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  dayCellSelected: { backgroundColor: '#6366f1', borderRadius: 20 },
  dayCellToday: { borderWidth: 1, borderColor: '#6366f1', borderRadius: 20 },
  dayText: { color: '#fff', fontSize: 14 },
  dayTextSelected: { fontWeight: '600' },
  dayTextToday: { color: '#6366f1' },
  eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f59e0b', position: 'absolute', bottom: 4 },
  eventsSection: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#fff', marginBottom: 16 },
  eventCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  eventHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  eventDateBadge: { backgroundColor: '#6366f1', borderRadius: 12, padding: 8, alignItems: 'center', marginRight: 12 },
  eventDateDay: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  eventDateMonth: { color: 'rgba(255,255,255,0.8)', fontSize: 12, textTransform: 'uppercase' },
  eventInfo: { flex: 1 },
  eventTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  eventCommunity: { color: '#9ca3af', fontSize: 13, marginTop: 4 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  onlineText: { color: '#10b981', fontSize: 12, fontWeight: '500' },
  eventDescription: { color: '#9ca3af', fontSize: 14, marginBottom: 12, lineHeight: 20 },
  eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  eventMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  eventMetaText: { color: '#6b7280', fontSize: 13 },
  joinButton: { backgroundColor: '#6366f1', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  joinedButton: { backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#10b981' },
  fullButton: { backgroundColor: '#374151' },
  joinButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  joinedButtonText: { color: '#10b981' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: '#6b7280', marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  modalBody: { padding: 20 },
  input: { backgroundColor: '#374151', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, marginBottom: 12 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  createButton: { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  disabledButton: { opacity: 0.6 },
  createButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
