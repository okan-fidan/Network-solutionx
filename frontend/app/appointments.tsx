/**
 * Randevu Sistemi Sayfası
 */
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/services/api';
import { formatDistanceToNow, format, addDays, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TimeSlot {
  id: string;
  time: string;
  available: boolean;
}

interface Appointment {
  id: string;
  userId: string;
  userName: string;
  targetUserId: string;
  targetUserName: string;
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  note?: string;
  createdAt: string;
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [targetUser, setTargetUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'requests'>('upcoming');

  const timeSlots: TimeSlot[] = [
    { id: '1', time: '09:00', available: true },
    { id: '2', time: '10:00', available: true },
    { id: '3', time: '11:00', available: true },
    { id: '4', time: '12:00', available: false },
    { id: '5', time: '13:00', available: true },
    { id: '6', time: '14:00', available: true },
    { id: '7', time: '15:00', available: true },
    { id: '8', time: '16:00', available: true },
    { id: '9', time: '17:00', available: true },
  ];

  useEffect(() => {
    loadAppointments();
    if (userId) loadTargetUser();
  }, [userId]);

  const loadAppointments = async () => {
    try {
      const response = await api.get('/api/appointments');
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTargetUser = async () => {
    if (!userId) return;
    try {
      const response = await api.get(`/api/users/${userId}`);
      setTargetUser(response.data);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedTime || !userId) {
      Alert.alert('Hata', 'Lütfen bir saat seçin');
      return;
    }

    try {
      await api.post('/api/appointments', {
        targetUserId: userId,
        date: selectedDate.toISOString(),
        time: selectedTime,
        note: note.trim() || undefined,
      });

      Alert.alert('Başarılı', 'Randevu talebiniz gönderildi!');
      setShowBookingModal(false);
      setSelectedTime(null);
      setNote('');
      loadAppointments();
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.detail || 'Randevu oluşturulamadı');
    }
  };

  const handleUpdateStatus = async (appointmentId: string, status: 'confirmed' | 'cancelled') => {
    try {
      await api.put(`/api/appointments/${appointmentId}`, { status });
      Alert.alert('Başarılı', status === 'confirmed' ? 'Randevu onaylandı' : 'Randevu iptal edildi');
      loadAppointments();
    } catch (error) {
      Alert.alert('Hata', 'Güncellenemedi');
    }
  };

  const getDateDays = () => {
    const days = [];
    for (let i = 0; i < 14; i++) {
      days.push(addDays(new Date(), i));
    }
    return days;
  };

  const filteredAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.date);
    const now = new Date();
    
    if (activeTab === 'upcoming') {
      return aptDate >= now && apt.status !== 'cancelled';
    } else if (activeTab === 'past') {
      return aptDate < now || apt.status === 'completed';
    } else {
      return apt.targetUserId === user?.uid && apt.status === 'pending';
    }
  });

  const renderAppointmentCard = (apt: Appointment) => {
    const isMyRequest = apt.userId === user?.uid;
    const statusColors: any = {
      pending: '#f59e0b',
      confirmed: '#10b981',
      cancelled: '#ef4444',
      completed: '#6b7280',
    };
    const statusLabels: any = {
      pending: 'Bekliyor',
      confirmed: 'Onaylandı',
      cancelled: 'İptal',
      completed: 'Tamamlandı',
    };

    return (
      <View key={apt.id} style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentUser}>
            <View style={styles.appointmentAvatar}>
              <Ionicons name="person" size={20} color="#9ca3af" />
            </View>
            <View>
              <Text style={styles.appointmentName}>
                {isMyRequest ? apt.targetUserName : apt.userName}
              </Text>
              <Text style={styles.appointmentRole}>
                {isMyRequest ? 'Randevu aldığınız kişi' : 'Sizden randevu alan'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[apt.status] + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColors[apt.status] }]} />
            <Text style={[styles.statusText, { color: statusColors[apt.status] }]}>
              {statusLabels[apt.status]}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar" size={18} color="#6366f1" />
            <Text style={styles.detailText}>
              {format(new Date(apt.date), 'd MMMM yyyy', { locale: tr })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="time" size={18} color="#6366f1" />
            <Text style={styles.detailText}>{apt.time}</Text>
          </View>
          {apt.note && (
            <View style={styles.detailRow}>
              <Ionicons name="document-text" size={18} color="#6366f1" />
              <Text style={styles.detailText}>{apt.note}</Text>
            </View>
          )}
        </View>

        {apt.status === 'pending' && apt.targetUserId === user?.uid && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => handleUpdateStatus(apt.id, 'confirmed')}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Onayla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleUpdateStatus(apt.id, 'cancelled')}
            >
              <Ionicons name="close" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Reddet</Text>
            </TouchableOpacity>
          </View>
        )}
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {userId ? 'Randevu Al' : 'Randevularım'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {userId ? (
        // Booking View
        <ScrollView style={styles.content}>
          {targetUser && (
            <View style={styles.targetUserCard}>
              <View style={styles.targetUserAvatar}>
                <Ionicons name="person" size={32} color="#9ca3af" />
              </View>
              <View>
                <Text style={styles.targetUserName}>
                  {targetUser.firstName} {targetUser.lastName}
                </Text>
                <Text style={styles.targetUserTitle}>{targetUser.jobTitle || 'Girişimci'}</Text>
              </View>
            </View>
          )}

          {/* Date Selection */}
          <Text style={styles.sectionTitle}>Tarih Seçin</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.datesScroll}>
            {getDateDays().map((date, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dateCard,
                  isSameDay(date, selectedDate) && styles.dateCardActive,
                ]}
                onPress={() => setSelectedDate(date)}
              >
                <Text style={[styles.dateDay, isSameDay(date, selectedDate) && styles.dateDayActive]}>
                  {format(date, 'EEE', { locale: tr })}
                </Text>
                <Text style={[styles.dateNum, isSameDay(date, selectedDate) && styles.dateNumActive]}>
                  {format(date, 'd')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Time Selection */}
          <Text style={styles.sectionTitle}>Saat Seçin</Text>
          <View style={styles.timeSlotsGrid}>
            {timeSlots.map((slot) => (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.timeSlot,
                  !slot.available && styles.timeSlotDisabled,
                  selectedTime === slot.time && styles.timeSlotActive,
                ]}
                disabled={!slot.available}
                onPress={() => setSelectedTime(slot.time)}
              >
                <Text
                  style={[
                    styles.timeSlotText,
                    !slot.available && styles.timeSlotTextDisabled,
                    selectedTime === slot.time && styles.timeSlotTextActive,
                  ]}
                >
                  {slot.time}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note */}
          <Text style={styles.sectionTitle}>Not (Opsiyonel)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Randevu konusu hakkında kısa bir not..."
            placeholderTextColor="#6b7280"
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
          />

          {/* Book Button */}
          <TouchableOpacity
            style={[styles.bookButton, !selectedTime && styles.bookButtonDisabled]}
            onPress={handleBookAppointment}
            disabled={!selectedTime}
          >
            <Text style={styles.bookButtonText}>Randevu Talebi Gönder</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        // My Appointments View
        <>
          {/* Tabs */}
          <View style={styles.tabs}>
            {(['upcoming', 'requests', 'past'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'upcoming' ? 'Yaklaşan' : tab === 'requests' ? 'Talepler' : 'Geçmiş'}
                </Text>
                {tab === 'requests' && appointments.filter(a => a.targetUserId === user?.uid && a.status === 'pending').length > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {appointments.filter(a => a.targetUserId === user?.uid && a.status === 'pending').length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.content}>
            {filteredAppointments.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#374151" />
                <Text style={styles.emptyText}>Henüz randevu yok</Text>
              </View>
            ) : (
              filteredAppointments.map(renderAppointmentCard)
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1, padding: 16 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabText: { color: '#6b7280', fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: '#6366f1' },
  tabBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  targetUserCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 24, gap: 16 },
  targetUserAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  targetUserName: { color: '#fff', fontSize: 18, fontWeight: '600' },
  targetUserTitle: { color: '#6b7280', fontSize: 14, marginTop: 2 },
  sectionTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12, marginTop: 8 },
  datesScroll: { marginBottom: 24 },
  dateCard: { width: 56, height: 72, borderRadius: 12, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  dateCardActive: { backgroundColor: '#6366f1' },
  dateDay: { color: '#6b7280', fontSize: 12, fontWeight: '500' },
  dateDayActive: { color: '#e5e7eb' },
  dateNum: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 4 },
  dateNumActive: { color: '#fff' },
  timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  timeSlot: { width: '30%', backgroundColor: '#111827', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  timeSlotDisabled: { opacity: 0.4 },
  timeSlotActive: { backgroundColor: '#6366f1' },
  timeSlotText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  timeSlotTextDisabled: { color: '#6b7280' },
  timeSlotTextActive: { color: '#fff' },
  noteInput: { backgroundColor: '#111827', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, textAlignVertical: 'top', minHeight: 80, marginBottom: 24 },
  bookButton: { backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 32 },
  bookButtonDisabled: { opacity: 0.5 },
  bookButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 16 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  appointmentCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  appointmentUser: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appointmentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  appointmentName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  appointmentRole: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 12, fontWeight: '600' },
  appointmentDetails: { gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { color: '#e5e7eb', fontSize: 14 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
  confirmButton: { backgroundColor: '#10b981' },
  cancelButton: { backgroundColor: '#ef4444' },
  actionButtonText: { color: '#fff', fontWeight: '600' },
});
