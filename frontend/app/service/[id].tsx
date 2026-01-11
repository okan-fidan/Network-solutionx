import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/contexts/AuthContext';

interface Review {
  id: string;
  userId: string;
  userName: string;
  userImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface Service {
  id: string;
  title: string;
  description: string;
  price?: string;
  category: string;
  userId: string;
  userName: string;
  userImage?: string;
  userCity?: string;
  rating: number;
  reviewCount: number;
  images?: string[];
}

export default function ServiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, userProfile } = useAuth();
  
  const [service, setService] = useState<Service | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  
  // Appointment modal
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [appointmentNote, setAppointmentNote] = useState('');
  const [bookingAppointment, setBookingAppointment] = useState(false);

  useEffect(() => {
    loadServiceData();
  }, [id]);

  const loadServiceData = async () => {
    try {
      // Demo data
      const demoService: Service = {
        id: id || '1',
        title: 'Web Sitesi Tasarımı',
        description: 'Profesyonel ve modern web sitesi tasarımı hizmeti. SEO uyumlu, mobil responsive tasarımlar. WordPress, React veya özel çözümler.',
        price: '5.000 ₺\'den başlayan',
        category: 'Yazılım',
        userId: 'user1',
        userName: 'Ahmet Yılmaz',
        userImage: undefined,
        userCity: 'İstanbul',
        rating: 4.8,
        reviewCount: 24,
      };
      setService(demoService);

      const demoReviews: Review[] = [
        {
          id: '1',
          userId: 'user2',
          userName: 'Mehmet Kaya',
          rating: 5,
          comment: 'Harika bir iş çıkardı, kesinlikle tavsiye ederim!',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '2',
          userId: 'user3',
          userName: 'Ayşe Demir',
          rating: 4,
          comment: 'İyi çalışma, zamanında teslim etti.',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: '3',
          userId: 'user4',
          userName: 'Can Öztürk',
          rating: 5,
          comment: 'Profesyonel yaklaşım, kaliteli iş.',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ];
      setReviews(demoReviews);
    } catch (error) {
      console.error('Error loading service:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewComment.trim()) {
      Alert.alert('Hata', 'Lütfen bir yorum yazın');
      return;
    }

    setSubmittingReview(true);
    try {
      const newReview: Review = {
        id: Date.now().toString(),
        userId: user?.uid || '',
        userName: `${userProfile?.firstName || 'Kullanıcı'} ${userProfile?.lastName || ''}`,
        rating: reviewRating,
        comment: reviewComment,
        createdAt: new Date().toISOString(),
      };
      setReviews([newReview, ...reviews]);
      setShowReviewModal(false);
      setReviewRating(5);
      setReviewComment('');
      Alert.alert('Başarılı', 'Değerlendirmeniz gönderildi');
    } catch (error) {
      Alert.alert('Hata', 'Değerlendirme gönderilemedi');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      Alert.alert('Hata', 'Lütfen tarih ve saat seçin');
      return;
    }

    setBookingAppointment(true);
    try {
      // API call would go here
      Alert.alert(
        'Randevu Talebi Gönderildi',
        `${selectedDate} tarihinde saat ${selectedTime} için randevu talebiniz gönderildi. Hizmet sağlayıcı onayladığında bilgilendirileceksiniz.`,
        [{ text: 'Tamam', onPress: () => setShowAppointmentModal(false) }]
      );
      setSelectedDate('');
      setSelectedTime('');
      setAppointmentNote('');
    } catch (error) {
      Alert.alert('Hata', 'Randevu talebi gönderilemedi');
    } finally {
      setBookingAppointment(false);
    }
  };

  const getNextDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' }),
      });
    }
    return days;
  };

  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

  const renderStars = (rating: number, size: number = 16, onPress?: (star: number) => void) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onPress && onPress(star)}
            disabled={!onPress}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={size}
              color="#f59e0b"
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
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

  if (!service) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Hizmet bulunamadı</Text>
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
        <Text style={styles.headerTitle}>Hizmet Detayı</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Service Info */}
        <View style={styles.serviceCard}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{service.category}</Text>
          </View>
          <Text style={styles.serviceTitle}>{service.title}</Text>
          
          {/* Rating */}
          <View style={styles.ratingContainer}>
            {renderStars(Math.round(service.rating))}
            <Text style={styles.ratingText}>{service.rating}</Text>
            <Text style={styles.reviewCountText}>({service.reviewCount} değerlendirme)</Text>
          </View>

          <Text style={styles.serviceDescription}>{service.description}</Text>

          {service.price && (
            <View style={styles.priceContainer}>
              <Ionicons name="pricetag" size={20} color="#10b981" />
              <Text style={styles.priceText}>{service.price}</Text>
            </View>
          )}
        </View>

        {/* Provider Info */}
        <TouchableOpacity 
          style={styles.providerCard}
          onPress={() => router.push(`/user/${service.userId}`)}
        >
          <View style={styles.providerAvatar}>
            {service.userImage ? (
              <Image source={{ uri: service.userImage }} style={styles.providerImage} />
            ) : (
              <Ionicons name="person" size={24} color="#9ca3af" />
            )}
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{service.userName}</Text>
            {service.userCity && (
              <View style={styles.providerLocation}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.providerLocationText}>{service.userCity}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color="#6b7280" />
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.contactButton}
            onPress={() => router.push(`/chat/${service.userId}`)}
          >
            <Ionicons name="chatbubble" size={20} color="#fff" />
            <Text style={styles.contactButtonText}>Mesaj Gönder</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.appointmentButton}
            onPress={() => setShowAppointmentModal(true)}
          >
            <Ionicons name="calendar" size={20} color="#6366f1" />
            <Text style={styles.appointmentButtonText}>Randevu Al</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews Section */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Değerlendirmeler</Text>
            <TouchableOpacity 
              style={styles.addReviewBtn}
              onPress={() => setShowReviewModal(true)}
            >
              <Ionicons name="add" size={20} color="#6366f1" />
              <Text style={styles.addReviewText}>Değerlendir</Text>
            </TouchableOpacity>
          </View>

          {reviews.length > 0 ? (
            reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewerAvatar}>
                    <Ionicons name="person" size={18} color="#9ca3af" />
                  </View>
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.userName}</Text>
                    <Text style={styles.reviewDate}>{formatDate(review.createdAt)}</Text>
                  </View>
                  {renderStars(review.rating, 14)}
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyReviews}>
              <Ionicons name="chatbubble-outline" size={40} color="#374151" />
              <Text style={styles.emptyText}>Henüz değerlendirme yok</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Review Modal */}
      <Modal visible={showReviewModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Değerlendirme Yap</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.ratingLabel}>Puanınız</Text>
              <View style={styles.ratingSelector}>
                {renderStars(reviewRating, 32, setReviewRating)}
              </View>

              <Text style={styles.inputLabel}>Yorumunuz</Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Deneyiminizi paylaşın..."
                placeholderTextColor="#6b7280"
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submittingReview && styles.disabledBtn]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Gönder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appointment Modal */}
      <Modal visible={showAppointmentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Randevu Al</Text>
              <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Tarih Seçin</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelector}>
                {getNextDays().map((day) => (
                  <TouchableOpacity
                    key={day.date}
                    style={[styles.dateOption, selectedDate === day.date && styles.dateOptionActive]}
                    onPress={() => setSelectedDate(day.date)}
                  >
                    <Text style={[styles.dateOptionText, selectedDate === day.date && styles.dateOptionTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Saat Seçin</Text>
              <View style={styles.timeGrid}>
                {timeSlots.map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[styles.timeOption, selectedTime === time && styles.timeOptionActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Text style={[styles.timeOptionText, selectedTime === time && styles.timeOptionTextActive]}>
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Not (opsiyonel)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Randevu hakkında not ekleyin..."
                placeholderTextColor="#6b7280"
                value={appointmentNote}
                onChangeText={setAppointmentNote}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, bookingAppointment && styles.disabledBtn]}
                onPress={handleBookAppointment}
                disabled={bookingAppointment}
              >
                {bookingAppointment ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="calendar-outline" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>Randevu Talebi Gönder</Text>
                  </>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#6b7280', fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  shareButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  content: { flex: 1 },
  serviceCard: { backgroundColor: '#111827', margin: 16, borderRadius: 16, padding: 20 },
  categoryBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(99, 102, 241, 0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  categoryText: { color: '#6366f1', fontSize: 12, fontWeight: '600' },
  serviceTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12 },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  starsContainer: { flexDirection: 'row', gap: 2 },
  ratingText: { color: '#f59e0b', fontSize: 16, fontWeight: '600' },
  reviewCountText: { color: '#6b7280', fontSize: 14 },
  serviceDescription: { color: '#9ca3af', fontSize: 15, lineHeight: 22, marginBottom: 16 },
  priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: 12, borderRadius: 10 },
  priceText: { color: '#10b981', fontSize: 16, fontWeight: '600' },
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', marginHorizontal: 16, borderRadius: 12, padding: 16 },
  providerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  providerImage: { width: '100%', height: '100%' },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  providerLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  providerLocationText: { color: '#6b7280', fontSize: 13 },
  actionButtons: { flexDirection: 'row', gap: 12, margin: 16 },
  contactButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, gap: 8 },
  contactButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  appointmentButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#6366f1', paddingVertical: 14, borderRadius: 12, gap: 8 },
  appointmentButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '600' },
  reviewsSection: { marginHorizontal: 16, marginBottom: 24 },
  reviewsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  addReviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  addReviewText: { color: '#6366f1', fontSize: 14, fontWeight: '500' },
  reviewCard: { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  reviewerInfo: { flex: 1, marginLeft: 10 },
  reviewerName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  reviewDate: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  reviewComment: { color: '#9ca3af', fontSize: 14, lineHeight: 20 },
  emptyReviews: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#6b7280', marginTop: 12, fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#374151' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  modalBody: { padding: 20 },
  ratingLabel: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 12 },
  ratingSelector: { alignItems: 'center', marginBottom: 24 },
  inputLabel: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  reviewInput: { backgroundColor: '#374151', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, minHeight: 100, textAlignVertical: 'top', marginBottom: 20 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6366f1', padding: 16, borderRadius: 12, gap: 8 },
  disabledBtn: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  dateSelector: { marginBottom: 20 },
  dateOption: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#374151', borderRadius: 10, marginRight: 8 },
  dateOptionActive: { backgroundColor: '#6366f1' },
  dateOptionText: { color: '#9ca3af', fontSize: 13 },
  dateOptionTextActive: { color: '#fff', fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  timeOption: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#374151', borderRadius: 8 },
  timeOptionActive: { backgroundColor: '#6366f1' },
  timeOptionText: { color: '#9ca3af', fontSize: 14 },
  timeOptionTextActive: { color: '#fff', fontWeight: '600' },
  noteInput: { backgroundColor: '#374151', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
});
