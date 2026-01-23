import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../src/config/firebase';
import api from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { showToast } from '../../src/components/ui';

// Türkiye şehirleri
const TURKISH_CITIES = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin',
  'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur',
  'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan',
  'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul',
  'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir',
  'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş',
  'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas',
  'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'
];

export default function EditProfileScreen() {
  const { userProfile, refreshProfile, user } = useAuth();
  const router = useRouter();
  
  const [firstName, setFirstName] = useState(userProfile?.firstName || '');
  const [lastName, setLastName] = useState(userProfile?.lastName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [occupation, setOccupation] = useState(userProfile?.occupation || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [bio, setBio] = useState(userProfile?.bio || '');
  const [profileImage, setProfileImage] = useState(userProfile?.profileImageUrl || '');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  
  // Yeni: Beceriler (Skills)
  const [skills, setSkills] = useState<string[]>(userProfile?.skills || []);
  const [newSkill, setNewSkill] = useState('');
  
  // Yeni: İş Deneyimi
  const [workExperience, setWorkExperience] = useState<any[]>(userProfile?.workExperience || []);
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [editingExperience, setEditingExperience] = useState<any>(null);
  
  // Yeni: Sosyal Medya Linkleri
  const [socialLinks, setSocialLinks] = useState<any>(userProfile?.socialLinks || {});

  const BIO_MAX_LENGTH = 150; // Instagram standardı
  const SKILLS_MAX = 10;
  const SKILL_MAX_LENGTH = 30;

  const filteredCities = citySearch
    ? TURKISH_CITIES.filter(c => 
        c.toLowerCase().includes(citySearch.toLowerCase())
      )
    : TURKISH_CITIES;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showToast.error('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user?.uid) return;
    setUploadingImage(true);

    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `profile_images/${user.uid}_${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      setProfileImage(downloadURL);
      showToast.success('Başarılı', 'Fotoğraf yüklendi');
    } catch (error) {
      console.error('Error uploading image:', error);
      showToast.error('Hata', 'Fotoğraf yüklenemedi');
    } finally {
      setUploadingImage(false);
    }
  };

  // Beceri ekleme
  const addSkill = () => {
    if (newSkill.trim() && skills.length < SKILLS_MAX) {
      const trimmedSkill = newSkill.trim().substring(0, SKILL_MAX_LENGTH);
      if (!skills.includes(trimmedSkill)) {
        setSkills([...skills, trimmedSkill]);
        setNewSkill('');
      }
    }
  };

  // Beceri silme
  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(s => s !== skillToRemove));
  };

  // İş deneyimi ekleme
  const addExperience = (exp: any) => {
    if (editingExperience) {
      setWorkExperience(workExperience.map(e => e.id === editingExperience.id ? exp : e));
      setEditingExperience(null);
    } else {
      setWorkExperience([...workExperience, { ...exp, id: Date.now().toString() }]);
    }
    setShowAddExperience(false);
  };

  // İş deneyimi silme
  const removeExperience = (id: string) => {
    setWorkExperience(workExperience.filter(e => e.id !== id));
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showToast.error('Hata', 'Ad ve soyad zorunludur');
      return;
    }

    if (!city) {
      showToast.error('Hata', 'Lütfen şehir seçin');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        occupation: occupation.trim(),
        city: city,
        bio: bio.trim(),
        profileImageUrl: profileImage,
        skills: skills,
        workExperience: workExperience,
        socialLinks: socialLinks,
      };
      
      console.log('Updating profile with:', updateData);
      
      await api.put('/api/user/profile', updateData);
      
      await refreshProfile();
      showToast.success('Başarılı', 'Profil güncellendi');
      router.back();
    } catch (error: any) {
      console.error('Error updating profile:', error?.response?.data || error?.message || error);
      showToast.error('Hata', error?.response?.data?.detail || 'Profil güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const CityPickerModal = () => (
    <Modal
      visible={showCityPicker}
      animationType="slide"
      transparent
      onRequestClose={() => setShowCityPicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Şehir Seçin</Text>
            <TouchableOpacity onPress={() => setShowCityPicker(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Arama */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Şehir ara..."
              placeholderTextColor="#6b7280"
              value={citySearch}
              onChangeText={setCitySearch}
              autoFocus
            />
            {citySearch.length > 0 && (
              <TouchableOpacity onPress={() => setCitySearch('')}>
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>

          {/* Şehir Listesi */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.cityItem,
                  city === item && styles.cityItemSelected
                ]}
                onPress={() => {
                  setCity(item);
                  setShowCityPicker(false);
                  setCitySearch('');
                }}
              >
                <Ionicons 
                  name="location" 
                  size={20} 
                  color={city === item ? '#6366f1' : '#6b7280'} 
                />
                <Text style={[
                  styles.cityItemText,
                  city === item && styles.cityItemTextSelected
                ]}>
                  {item}
                </Text>
                {city === item && (
                  <Ionicons name="checkmark-circle" size={22} color="#6366f1" />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Ionicons name="search-outline" size={40} color="#374151" />
                <Text style={styles.emptyText}>Şehir bulunamadı</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profili Düzenle</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#6366f1" />
          ) : (
            <Text style={styles.saveButton}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Profile Image */}
        <View style={styles.imageSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage} disabled={uploadingImage}>
            {uploadingImage ? (
              <ActivityIndicator size="large" color="#6366f1" />
            ) : profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="person" size={48} color="#6b7280" />
              </View>
            )}
            <View style={styles.editImageBadge}>
              <Ionicons name="camera" size={18} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Profil fotoğrafını değiştirmek için dokun</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ad *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Adınız"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Soyad *</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Soyadınız"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="05XX XXX XX XX"
              placeholderTextColor="#6b7280"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Şehir *</Text>
            <TouchableOpacity
              style={styles.citySelector}
              onPress={() => setShowCityPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={20} color="#9ca3af" />
              <Text style={[styles.citySelectorText, !city && styles.placeholder]}>
                {city || 'Şehir Seçin'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Meslek / Sektör</Text>
            <TextInput
              style={styles.input}
              value={occupation}
              onChangeText={setOccupation}
              placeholder="Örn: Yazılım Geliştirici"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Biyografi</Text>
              <Text style={[styles.charCount, bio.length >= BIO_MAX_LENGTH && styles.charCountMax]}>
                {bio.length}/{BIO_MAX_LENGTH}
              </Text>
            </View>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={(text) => setBio(text.slice(0, BIO_MAX_LENGTH))}
              placeholder="Kendinizi kısaca tanıtın..."
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={4}
              maxLength={BIO_MAX_LENGTH}
              textAlignVertical="top"
            />
            <Text style={styles.hint}>Profilinizde görünecek kısa açıklama</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>E-posta</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{userProfile?.email}</Text>
            </View>
            <Text style={styles.hint}>E-posta adresi değiştirilemez</Text>
          </View>

          {/* Beceriler (Skills) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Beceriler ({skills.length}/{SKILLS_MAX})</Text>
            <View style={styles.skillsContainer}>
              {skills.map((skill, index) => (
                <View key={index} style={styles.skillTag}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <TouchableOpacity onPress={() => removeSkill(skill)}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            {skills.length < SKILLS_MAX && (
              <View style={styles.addSkillRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newSkill}
                  onChangeText={setNewSkill}
                  placeholder="Beceri ekle (ör: React Native)"
                  placeholderTextColor="#6b7280"
                  maxLength={SKILL_MAX_LENGTH}
                  onSubmitEditing={addSkill}
                />
                <TouchableOpacity style={styles.addSkillButton} onPress={addSkill}>
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.hint}>Uzmanlık alanlarınızı ekleyin (max 10)</Text>
          </View>

          {/* İş Deneyimi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İş Deneyimi</Text>
            {workExperience.map((exp, index) => (
              <View key={exp.id || index} style={styles.experienceCard}>
                <View style={styles.experienceHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.experienceTitle}>{exp.title}</Text>
                    <Text style={styles.experienceCompany}>{exp.company}</Text>
                    <Text style={styles.experienceDate}>
                      {exp.startDate} - {exp.current ? 'Devam ediyor' : exp.endDate}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeExperience(exp.id)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                {exp.description && (
                  <Text style={styles.experienceDescription}>{exp.description}</Text>
                )}
              </View>
            ))}
            <TouchableOpacity 
              style={styles.addExperienceButton}
              onPress={() => setShowAddExperience(true)}
            >
              <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
              <Text style={styles.addExperienceText}>İş Deneyimi Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Sosyal Medya */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sosyal Medya</Text>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIcon}>
                <Ionicons name="logo-linkedin" size={20} color="#0077b5" />
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={socialLinks.linkedin || ''}
                onChangeText={(text) => setSocialLinks({...socialLinks, linkedin: text})}
                placeholder="LinkedIn profil linki"
                placeholderTextColor="#6b7280"
              />
            </View>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIcon}>
                <Ionicons name="logo-instagram" size={20} color="#e4405f" />
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={socialLinks.instagram || ''}
                onChangeText={(text) => setSocialLinks({...socialLinks, instagram: text})}
                placeholder="Instagram kullanıcı adı"
                placeholderTextColor="#6b7280"
              />
            </View>
            <View style={styles.socialInputRow}>
              <View style={styles.socialIcon}>
                <Ionicons name="globe-outline" size={20} color="#6366f1" />
              </View>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={socialLinks.website || ''}
                onChangeText={(text) => setSocialLinks({...socialLinks, website: text})}
                placeholder="Web siteniz"
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* İş Deneyimi Ekleme Modal */}
      <Modal
        visible={showAddExperience}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddExperience(false)}
      >
        <ExperienceForm 
          onSave={addExperience}
          onClose={() => setShowAddExperience(false)}
          initialData={editingExperience}
        />
      </Modal>

      <CityPickerModal />
    </SafeAreaView>
  );
}

// İş Deneyimi Formu
const ExperienceForm = ({ onSave, onClose, initialData }: any) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [company, setCompany] = useState(initialData?.company || '');
  const [startDate, setStartDate] = useState(initialData?.startDate || '');
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [current, setCurrent] = useState(initialData?.current || false);
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSave = () => {
    if (!title.trim() || !company.trim()) {
      return;
    }
    onSave({
      id: initialData?.id,
      title: title.trim(),
      company: company.trim(),
      startDate,
      endDate: current ? null : endDate,
      current,
      description: description.trim()
    });
  };

  return (
    <View style={expStyles.overlay}>
      <View style={expStyles.container}>
        <View style={expStyles.header}>
          <Text style={expStyles.title}>İş Deneyimi Ekle</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#9ca3af" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={expStyles.form}>
          <View style={expStyles.inputGroup}>
            <Text style={expStyles.label}>Pozisyon *</Text>
            <TextInput
              style={expStyles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Yazılım Geliştirici"
              placeholderTextColor="#6b7280"
            />
          </View>
          
          <View style={expStyles.inputGroup}>
            <Text style={expStyles.label}>Şirket *</Text>
            <TextInput
              style={expStyles.input}
              value={company}
              onChangeText={setCompany}
              placeholder="ABC Teknoloji"
              placeholderTextColor="#6b7280"
            />
          </View>
          
          <View style={expStyles.row}>
            <View style={[expStyles.inputGroup, { flex: 1 }]}>
              <Text style={expStyles.label}>Başlangıç</Text>
              <TextInput
                style={expStyles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2020"
                placeholderTextColor="#6b7280"
              />
            </View>
            <View style={[expStyles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={expStyles.label}>Bitiş</Text>
              <TextInput
                style={[expStyles.input, current && { opacity: 0.5 }]}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2023"
                placeholderTextColor="#6b7280"
                editable={!current}
              />
            </View>
          </View>
          
          <TouchableOpacity 
            style={expStyles.checkboxRow}
            onPress={() => setCurrent(!current)}
          >
            <View style={[expStyles.checkbox, current && expStyles.checkboxChecked]}>
              {current && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={expStyles.checkboxLabel}>Hala burada çalışıyorum</Text>
          </TouchableOpacity>
          
          <View style={expStyles.inputGroup}>
            <Text style={expStyles.label}>Açıklama</Text>
            <TextInput
              style={[expStyles.input, { minHeight: 80 }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Yaptığınız işleri kısaca açıklayın..."
              placeholderTextColor="#6b7280"
              multiline
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
        
        <TouchableOpacity style={expStyles.saveButton} onPress={handleSave}>
          <Text style={expStyles.saveButtonText}>Kaydet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const expStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  container: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#374151' },
  title: { fontSize: 18, fontWeight: '600', color: '#fff' },
  form: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  input: { backgroundColor: '#374151', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16 },
  row: { flexDirection: 'row' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#6366f1' },
  checkboxLabel: { color: '#e5e7eb', fontSize: 15 },
  saveButton: { backgroundColor: '#6366f1', margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  saveButton: { color: '#6366f1', fontSize: 16, fontWeight: '600' },
  content: { flex: 1 },
  imageSection: { alignItems: 'center', paddingVertical: 32 },
  imageContainer: { position: 'relative', width: 120, height: 120 },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  placeholderImage: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center' },
  editImageBadge: { position: 'absolute', bottom: 4, right: 4, width: 36, height: 36, borderRadius: 18, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#0a0a0a' },
  imageHint: { color: '#6b7280', fontSize: 13, marginTop: 12 },
  form: { paddingHorizontal: 16, paddingBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { color: '#9ca3af', fontSize: 14, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  charCount: { color: '#6b7280', fontSize: 12 },
  charCountMax: { color: '#f59e0b' },
  input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  bioInput: { minHeight: 100, paddingTop: 16 },
  disabledInput: { backgroundColor: '#111827', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1f2937' },
  disabledText: { color: '#6b7280', fontSize: 16 },
  hint: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  citySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  citySelectorText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    color: '#6b7280',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  cityItemSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  cityItemText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  cityItemTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 12,
  },
});
