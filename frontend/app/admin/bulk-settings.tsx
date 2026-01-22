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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';
import Toast from 'react-native-toast-message';

export default function BulkSettingsScreen() {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const router = useRouter();

  const handleBulkDescription = async () => {
    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen bir açıklama yazın');
      return;
    }

    Alert.alert(
      'Toplu Açıklama Güncelleme',
      'Tüm grupların açıklaması bu metin ile değiştirilecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Güncelle',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const response = await api.put('/api/admin/subgroups/bulk-description', {
                description: description.trim()
              });
              Toast.show({
                type: 'success',
                text1: 'Başarılı',
                text2: response.data.message,
              });
              setDescription('');
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: error.response?.data?.detail || 'İşlem başarısız',
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleGenerateAvatars = async (target: 'subgroups' | 'communities' | 'all') => {
    const targetText = target === 'all' ? 'tüm gruplar ve topluluklar' : 
                       target === 'subgroups' ? 'tüm alt gruplar' : 'tüm topluluklar';
    
    Alert.alert(
      'Otomatik Avatar Oluştur',
      `${targetText} için isimlerine göre otomatik avatar oluşturulacak. Mevcut resimler değiştirilecek. Emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Oluştur',
          onPress: async () => {
            setAvatarLoading(true);
            try {
              const response = await api.post('/api/admin/generate-avatars', { target });
              Toast.show({
                type: 'success',
                text1: 'Başarılı',
                text2: response.data.message,
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: error.response?.data?.detail || 'İşlem başarısız',
              });
            } finally {
              setAvatarLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Toplu Ayarlar</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Toplu Açıklama Değiştirme */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
              <Ionicons name="text" size={24} color="#6366f1" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Toplu Açıklama Değiştir</Text>
              <Text style={styles.sectionSubtitle}>Tüm grupların açıklamasını değiştir</Text>
            </View>
          </View>

          <TextInput
            style={styles.textArea}
            placeholder="Yeni grup açıklaması yazın..."
            placeholderTextColor="#6b7280"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
          
          <Text style={styles.charCount}>{description.length}/500</Text>

          <TouchableOpacity 
            style={[styles.actionButton, loading && styles.buttonDisabled]}
            onPress={handleBulkDescription}
            disabled={loading || !description.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Tüm Grupları Güncelle</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Otomatik Avatar Oluşturma */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
              <Ionicons name="images" size={24} color="#ec4899" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Otomatik Avatar Oluştur</Text>
              <Text style={styles.sectionSubtitle}>İsme göre profil resmi oluştur</Text>
            </View>
          </View>

          <Text style={styles.infoText}>
            Bu işlem, grup ve topluluk isimlerinin baş harfine göre otomatik profil resmi oluşturur. 
            Her isim için tutarlı bir renk seçilir.
          </Text>

          {avatarLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ec4899" />
              <Text style={styles.loadingText}>Avatarlar oluşturuluyor...</Text>
            </View>
          ) : (
            <View style={styles.avatarButtons}>
              <TouchableOpacity 
                style={[styles.avatarButton, { backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: '#6366f1' }]}
                onPress={() => handleGenerateAvatars('subgroups')}
              >
                <Ionicons name="chatbubbles" size={28} color="#6366f1" />
                <Text style={[styles.avatarButtonTitle, { color: '#6366f1' }]}>Alt Gruplar</Text>
                <Text style={styles.avatarButtonSubtitle}>Tüm alt gruplar için</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.avatarButton, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: '#10b981' }]}
                onPress={() => handleGenerateAvatars('communities')}
              >
                <Ionicons name="business" size={28} color="#10b981" />
                <Text style={[styles.avatarButtonTitle, { color: '#10b981' }]}>Topluluklar</Text>
                <Text style={styles.avatarButtonSubtitle}>81 il topluluğu için</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.avatarButton, { backgroundColor: 'rgba(236, 72, 153, 0.1)', borderColor: '#ec4899' }]}
                onPress={() => handleGenerateAvatars('all')}
              >
                <Ionicons name="globe" size={28} color="#ec4899" />
                <Text style={[styles.avatarButtonTitle, { color: '#ec4899' }]}>Hepsi</Text>
                <Text style={styles.avatarButtonSubtitle}>Tüm grup ve topluluklar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Avatar Renk Paleti Önizleme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Renk Paleti</Text>
          <Text style={styles.sectionSubtitle}>İsimlere göre atanacak renkler</Text>
          
          <View style={styles.colorPalette}>
            {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', 
              '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6b7280'].map((color, index) => (
              <View key={index} style={[styles.colorSwatch, { backgroundColor: color }]}>
                <Text style={styles.colorSwatchText}>{String.fromCharCode(65 + index)}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1, padding: 16 },
  
  section: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 14 },
  sectionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '600' },
  sectionSubtitle: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  
  textArea: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 15, minHeight: 120, marginBottom: 8 },
  charCount: { color: '#6b7280', fontSize: 12, textAlign: 'right', marginBottom: 16 },
  
  actionButton: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  buttonDisabled: { backgroundColor: '#374151' },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  
  infoText: { color: '#9ca3af', fontSize: 14, lineHeight: 20, marginBottom: 20 },
  
  loadingContainer: { alignItems: 'center', paddingVertical: 32 },
  loadingText: { color: '#9ca3af', marginTop: 12 },
  
  avatarButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  avatarButton: { flex: 1, minWidth: '45%', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  avatarButtonTitle: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  avatarButtonSubtitle: { color: '#6b7280', fontSize: 11, marginTop: 4 },
  
  colorPalette: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  colorSwatchText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
