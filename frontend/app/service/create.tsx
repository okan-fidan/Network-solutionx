import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/services/api';

const CATEGORIES = [
  { value: 'consulting', label: 'Danışmanlık', icon: 'bulb-outline' },
  { value: 'marketing', label: 'Pazarlama', icon: 'megaphone-outline' },
  { value: 'design', label: 'Tasarım', icon: 'color-palette-outline' },
  { value: 'development', label: 'Yazılım', icon: 'code-slash-outline' },
  { value: 'finance', label: 'Finans', icon: 'calculator-outline' },
  { value: 'legal', label: 'Hukuk', icon: 'document-text-outline' },
  { value: 'education', label: 'Eğitim', icon: 'school-outline' },
  { value: 'health', label: 'Sağlık', icon: 'fitness-outline' },
  { value: 'construction', label: 'İnşaat', icon: 'construct-outline' },
  { value: 'transport', label: 'Nakliyat', icon: 'car-outline' },
  { value: 'food', label: 'Yemek', icon: 'restaurant-outline' },
  { value: 'other', label: 'Diğer', icon: 'ellipsis-horizontal-outline' },
];

export default function CreateServiceScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('consulting');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const router = useRouter();

  const selectedCategory = CATEGORIES.find(c => c.value === category);

  const handleCreate = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Hata', 'Lütfen başlık ve açıklama girin');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/services', {
        title: title.trim(),
        description: description.trim(),
        category,
        price: price ? parseFloat(price) : null,
      });
      Alert.alert('Başarılı', 'Hizmetiniz eklendi!', [
        { text: 'Tamam', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creating service:', error);
      Alert.alert('Hata', 'Hizmet eklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: typeof CATEGORIES[0] }) => (
    <TouchableOpacity
      style={[styles.categoryItem, category === item.value && styles.categoryItemSelected]}
      onPress={() => {
        setCategory(item.value);
        setShowCategoryModal(false);
      }}
    >
      <View style={[styles.categoryIcon, category === item.value && styles.categoryIconSelected]}>
        <Ionicons name={item.icon as any} size={24} color={category === item.value ? '#fff' : '#9ca3af'} />
      </View>
      <Text style={[styles.categoryLabel, category === item.value && styles.categoryLabelSelected]}>
        {item.label}
      </Text>
      {category === item.value && (
        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Hizmet Ekle</Text>
          <TouchableOpacity
            style={[styles.saveButton, (!title.trim() || !description.trim() || loading) && styles.saveButtonDisabled]}
            onPress={handleCreate}
            disabled={!title.trim() || !description.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Kaydet</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hizmet Başlığı</Text>
            <TextInput
              style={styles.input}
              placeholder="Örn: Web Sitesi Tasarımı"
              placeholderTextColor="#6b7280"
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kategori</Text>
            <TouchableOpacity 
              style={styles.categorySelector}
              onPress={() => setShowCategoryModal(true)}
            >
              <View style={styles.categorySelectorContent}>
                <View style={styles.categorySelectorIcon}>
                  <Ionicons name={selectedCategory?.icon as any} size={20} color="#10b981" />
                </View>
                <Text style={styles.categorySelectorText}>{selectedCategory?.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Hizmetinizi detaylı açıklayın..."
              placeholderTextColor="#6b7280"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fiyat (Opsiyonel)</Text>
            <View style={styles.priceInput}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="0"
                placeholderTextColor="#6b7280"
                value={price}
                onChangeText={setPrice}
                keyboardType="numeric"
              />
              <Text style={styles.currency}>₺</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kategori Seçin</Text>
              <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                <Ionicons name="close" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item.value}
              renderItem={renderCategoryItem}
              contentContainerStyle={styles.categoryList}
              showsVerticalScrollIndicator={false}
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
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  saveButton: { backgroundColor: '#10b981', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  inputGroup: { marginBottom: 24 },
  label: { color: '#9ca3af', fontSize: 14, fontWeight: '500', marginBottom: 8 },
  input: { backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#fff', fontSize: 16 },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  priceInput: { flexDirection: 'row', alignItems: 'center' },
  currency: { color: '#6b7280', fontSize: 18, marginLeft: 12 },

  // Category Selector
  categorySelector: { 
    backgroundColor: '#1f2937', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categorySelectorContent: { flexDirection: 'row', alignItems: 'center' },
  categorySelectorIcon: { 
    width: 36, 
    height: 36, 
    borderRadius: 8, 
    backgroundColor: 'rgba(16, 185, 129, 0.15)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 12,
  },
  categorySelectorText: { color: '#fff', fontSize: 16 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#111827', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16, 
    borderBottomWidth: 1, 
    borderBottomColor: '#1f2937' 
  },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  categoryList: { padding: 16 },
  categoryItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#1f2937',
  },
  categoryItemSelected: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderWidth: 1, borderColor: '#10b981' },
  categoryIcon: { 
    width: 44, 
    height: 44, 
    borderRadius: 10, 
    backgroundColor: '#374151', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginRight: 14,
  },
  categoryIconSelected: { backgroundColor: '#10b981' },
  categoryLabel: { flex: 1, color: '#fff', fontSize: 16 },
  categoryLabelSelected: { color: '#10b981', fontWeight: '600' },
});
