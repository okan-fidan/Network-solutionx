import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';

const REPORT_REASONS = {
  user: [
    { id: 'spam', label: 'Spam veya Reklam', icon: 'megaphone' },
    { id: 'harassment', label: 'Taciz veya Zorbalık', icon: 'alert-circle' },
    { id: 'fake', label: 'Sahte Hesap', icon: 'person-remove' },
    { id: 'inappropriate', label: 'Uygunsuz Davranış', icon: 'warning' },
    { id: 'scam', label: 'Dolandırıcılık', icon: 'shield-checkmark' },
    { id: 'other', label: 'Diğer', icon: 'ellipsis-horizontal' },
  ],
  content: [
    { id: 'spam', label: 'Spam veya Reklam', icon: 'megaphone' },
    { id: 'violence', label: 'Şiddet İçerikli', icon: 'skull' },
    { id: 'hate', label: 'Nefret Söylemi', icon: 'flame' },
    { id: 'inappropriate', label: 'Uygunsuz İçerik', icon: 'eye-off' },
    { id: 'misinformation', label: 'Yanlış Bilgi', icon: 'information-circle' },
    { id: 'copyright', label: 'Telif Hakkı İhlali', icon: 'document' },
    { id: 'other', label: 'Diğer', icon: 'ellipsis-horizontal' },
  ],
};

export default function ReportScreen() {
  const router = useRouter();
  const { type, id, contentType } = useLocalSearchParams<{ 
    type: 'user' | 'content';
    id: string;
    contentType?: string;
  }>();

  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = type === 'user' ? REPORT_REASONS.user : REPORT_REASONS.content;

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Hata', 'Lütfen bir sebep seçin');
      return;
    }

    setLoading(true);
    try {
      if (type === 'user') {
        await api.post('/api/security/report/user', {
          userId: id,
          reason: selectedReason,
          details: details,
        });
      } else {
        await api.post('/api/security/report/content', {
          contentType: contentType || 'post',
          contentId: id,
          reason: selectedReason,
          details: details,
        });
      }
      
      Alert.alert(
        'Rapor Gönderildi',
        'Raporunuz incelenmek üzere gönderildi. Teşekkür ederiz.',
        [{ text: 'Tamam', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.detail || 'Rapor gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'user' ? 'Kullanıcı Raporla' : 'İçerik Raporla'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={32} color="#6366f1" />
          <Text style={styles.infoTitle}>Güvenli Bir Topluluk</Text>
          <Text style={styles.infoText}>
            Raporunuz gizli tutulacak ve ekibimiz tarafından incelenecektir.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Sebep Seçin</Text>
        
        <View style={styles.reasonsContainer}>
          {reasons.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={[
                styles.reasonCard,
                selectedReason === reason.id && styles.reasonCardSelected,
              ]}
              onPress={() => setSelectedReason(reason.id)}
            >
              <View style={[
                styles.reasonIcon,
                selectedReason === reason.id && styles.reasonIconSelected,
              ]}>
                <Ionicons 
                  name={reason.icon as any} 
                  size={24} 
                  color={selectedReason === reason.id ? '#fff' : '#9ca3af'} 
                />
              </View>
              <Text style={[
                styles.reasonLabel,
                selectedReason === reason.id && styles.reasonLabelSelected,
              ]}>
                {reason.label}
              </Text>
              {selectedReason === reason.id && (
                <Ionicons name="checkmark-circle" size={22} color="#6366f1" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Ek Detaylar (Opsiyonel)</Text>
        <TextInput
          style={styles.detailsInput}
          placeholder="Raporunuz hakkında daha fazla bilgi verin..."
          placeholderTextColor="#6b7280"
          value={details}
          onChangeText={setDetails}
          multiline
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={styles.charCount}>{details.length}/500</Text>

        <TouchableOpacity
          style={[styles.submitButton, !selectedReason && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Raporu Gönder</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Yanlış veya kötü niyetli raporlar, hesabınızın kısıtlanmasına neden olabilir.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1, padding: 16 },
  infoCard: { backgroundColor: '#1f2937', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 24 },
  infoTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 12, marginBottom: 8 },
  infoText: { color: '#9ca3af', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  reasonsContainer: { marginBottom: 24 },
  reasonCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  reasonCardSelected: { borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  reasonIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  reasonIconSelected: { backgroundColor: '#6366f1' },
  reasonLabel: { flex: 1, color: '#e5e7eb', fontSize: 15 },
  reasonLabelSelected: { color: '#fff', fontWeight: '500' },
  detailsInput: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, minHeight: 120, marginBottom: 8 },
  charCount: { color: '#6b7280', fontSize: 12, textAlign: 'right', marginBottom: 24 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 12, padding: 16, gap: 8 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disclaimer: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginTop: 16, marginBottom: 32, lineHeight: 18 },
});
