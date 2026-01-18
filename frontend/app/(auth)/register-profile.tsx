import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { showToast } from '../../src/components/ui';
import DateTimePicker from '@react-native-community/datetimepicker';

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

export default function RegisterProfileScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [occupation, setOccupation] = useState('');
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const { user, registerProfile } = useAuth();
  const router = useRouter();

  const filteredCities = citySearch
    ? TURKISH_CITIES.filter(c => 
        c.toLowerCase().includes(citySearch.toLowerCase())
      )
    : TURKISH_CITIES;

  // Minimum 13 yaş kontrolü
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() - 13);
  
  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 100);

  const formatDate = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const calculateAge = (date: Date) => {
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    return age;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleSubmit = async () => {
    if (!firstName.trim()) {
      showToast.error('Hata', 'Lütfen adınızı girin');
      return;
    }
    if (!lastName.trim()) {
      showToast.error('Hata', 'Lütfen soyadınızı girin');
      return;
    }
    if (!city) {
      showToast.error('Hata', 'Lütfen şehrinizi seçin');
      return;
    }
    if (!birthDate) {
      showToast.error('Hata', 'Lütfen doğum tarihinizi seçin');
      return;
    }

    const age = calculateAge(birthDate);
    if (age < 13) {
      showToast.error('Hata', 'Uygulamayı kullanmak için en az 13 yaşında olmalısınız');
      return;
    }

    setLoading(true);
    try {
      await registerProfile({
        email: user?.email || '',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        city,
        occupation: occupation.trim(),
        birthDate: birthDate.toISOString(),
      });
      showToast.success('Başarılı', 'Profiliniz oluşturuldu');
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error registering profile:', error);
      showToast.error('Hata', 'Profil oluşturulamadı');
    } finally {
      setLoading(false);
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

  const DatePickerModal = () => (
    <Modal
      visible={showDatePicker && Platform.OS === 'ios'}
      animationType="slide"
      transparent
      onRequestClose={() => setShowDatePicker(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.datePickerModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Doğum Tarihi</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneButton}>Tamam</Text>
            </TouchableOpacity>
          </View>
          
          <DateTimePicker
            value={birthDate || maxDate}
            mode="date"
            display="spinner"
            onChange={handleDateChange}
            maximumDate={maxDate}
            minimumDate={minDate}
            locale="tr"
            textColor="#fff"
            style={styles.datePicker}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="person-circle" size={80} color="#6366f1" />
            </View>
            <Text style={styles.title}>Profil Bilgileri</Text>
            <Text style={styles.subtitle}>Son bir adım kaldı!</Text>
          </View>

          <View style={styles.form}>
            {/* Ad */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ad *"
                placeholderTextColor="#6b7280"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
              />
            </View>

            {/* Soyad */}
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Soyad *"
                placeholderTextColor="#6b7280"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
              />
            </View>

            {/* Doğum Tarihi */}
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <Text style={[styles.inputText, !birthDate && styles.placeholder]}>
                {birthDate ? formatDate(birthDate) : 'Doğum Tarihi *'}
              </Text>
              {birthDate && (
                <View style={styles.ageBadge}>
                  <Text style={styles.ageText}>{calculateAge(birthDate)} yaş</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>

            {/* Telefon */}
            <View style={styles.inputContainer}>
              <Ionicons name="call-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Telefon (isteğe bağlı)"
                placeholderTextColor="#6b7280"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            {/* Şehir Seçici */}
            <TouchableOpacity
              style={styles.inputContainer}
              onPress={() => setShowCityPicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <Text style={[styles.inputText, !city && styles.placeholder]}>
                {city || 'Şehir Seçin *'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#6b7280" />
            </TouchableOpacity>

            {/* Meslek */}
            <View style={styles.inputContainer}>
              <Ionicons name="briefcase-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Meslek (isteğe bağlı)"
                placeholderTextColor="#6b7280"
                value={occupation}
                onChangeText={setOccupation}
              />
            </View>

            {/* Gönder Butonu */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Tamamla</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>

          <Text style={styles.note}>* işaretli alanlar zorunludur</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <CityPickerModal />
      <DatePickerModal />
      
      {/* Android DatePicker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={birthDate || maxDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={maxDate}
          minimumDate={minDate}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  inputText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  placeholder: {
    color: '#6b7280',
  },
  ageBadge: {
    backgroundColor: '#6366f120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  ageText: {
    color: '#6366f1',
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    color: '#6b7280',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
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
  datePickerModal: {
    backgroundColor: '#1f2937',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  doneButton: {
    fontSize: 17,
    fontWeight: '600',
    color: '#6366f1',
  },
  datePicker: {
    height: 200,
    backgroundColor: '#1f2937',
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
