import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../../src/config/firebase';

// Logo URL
const LOGO_URL = 'https://customer-assets.emergentagent.com/job_free-connect-6/artifacts/ae8wq3ei_IMG_20260123_224234.png';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSignup = async () => {
    console.log('=== handleSignup called ===');
    console.log('Email:', email, 'Password length:', password?.length, 'Confirm:', confirmPassword?.length);
    
    if (!email || !password || !confirmPassword) {
      console.log('Validation failed: empty fields');
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    if (!gender) {
      Alert.alert('Hata', 'Lütfen cinsiyetinizi seçin');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Hata', 'Devam etmek için Kullanım Koşulları ve Gizlilik Politikası\'nı kabul etmelisiniz');
      return;
    }

    if (password !== confirmPassword) {
      console.log('Validation failed: passwords dont match');
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      console.log('Validation failed: password too short');
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    console.log('Validation passed, setting loading...');
    setLoading(true);
    try {
      console.log('Calling signUp...');
      await signUp(email, password, gender);
      console.log('signUp successful!');
      
      // Email doğrulama gönder
      if (auth.currentUser) {
        try {
          await sendEmailVerification(auth.currentUser);
          console.log('Verification email sent to:', auth.currentUser.email);
          Alert.alert(
            'Kayıt Başarılı! ✉️',
            `${email} adresine doğrulama emaili gönderildi. Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.`,
            [{ text: 'Tamam', onPress: () => router.replace('/(auth)/verify-email') }]
          );
        } catch (verifyError: any) {
          console.log('Could not send verification email:', verifyError);
          // Hata olsa bile devam et, verify-email sayfasında tekrar deneyebilir
          Alert.alert(
            'Kayıt Başarılı',
            'Hesabınız oluşturuldu ancak doğrulama emaili gönderilemedi. Sonraki sayfada tekrar deneyebilirsiniz.',
            [{ text: 'Tamam', onPress: () => router.replace('/(auth)/verify-email') }]
          );
        }
      } else {
        // currentUser yoksa yine de verify-email sayfasına git
        router.replace('/(auth)/verify-email');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      let message = 'Kayıt yapılamadı';
      
      const errorCode = error?.code || '';
      const errorMessage = error?.message || '';
      
      if (errorCode === 'auth/email-already-in-use') {
        message = 'Bu email adresi zaten kullanımda';
      } else if (errorCode === 'auth/invalid-email') {
        message = 'Geçersiz email adresi';
      } else if (errorCode === 'auth/weak-password') {
        message = 'Şifre çok zayıf. En az 6 karakter ve güçlü bir şifre seçin.';
      } else if (errorCode === 'auth/network-request-failed') {
        message = 'İnternet bağlantınızı kontrol edin';
      } else if (errorMessage.includes('unknown error') || errorMessage.includes('Web server')) {
        message = 'Sunucu bağlantısında geçici bir sorun var. Lütfen tekrar deneyin.';
      }
      
      Alert.alert('Kayıt Hatası', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Image 
              source={{ uri: LOGO_URL }} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>Kayıt Ol</Text>
            <Text style={styles.subtitle}>Girişimci topluluğuna katılın</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#6b7280"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre"
                placeholderTextColor="#6b7280"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Şifre Tekrar"
                placeholderTextColor="#6b7280"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>

            {/* Cinsiyet Seçimi */}
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Cinsiyet</Text>
              <View style={styles.genderOptions}>
                <TouchableOpacity
                  style={[styles.genderOption, gender === 'male' && styles.genderOptionSelected]}
                  onPress={() => setGender('male')}
                >
                  <Ionicons 
                    name="male" 
                    size={24} 
                    color={gender === 'male' ? '#fff' : '#6b7280'} 
                  />
                  <Text style={[styles.genderText, gender === 'male' && styles.genderTextSelected]}>
                    Erkek
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderOption, gender === 'female' && styles.genderOptionSelected]}
                  onPress={() => setGender('female')}
                >
                  <Ionicons 
                    name="female" 
                    size={24} 
                    color={gender === 'female' ? '#fff' : '#6b7280'} 
                  />
                  <Text style={[styles.genderText, gender === 'female' && styles.genderTextSelected]}>
                    Kadın
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Kullanım Koşulları Onayı */}
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAcceptedTerms(!acceptedTerms)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
                {acceptedTerms && <Ionicons name="checkmark" size={16} color="#fff" />}
              </View>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText}>
                  <TouchableOpacity onPress={() => router.push('/terms')}>
                    <Text style={styles.termsLink}>Kullanım Koşulları</Text>
                  </TouchableOpacity>
                  <Text style={styles.termsText}> ve </Text>
                  <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
                    <Text style={styles.termsLink}>Gizlilik Politikası</Text>
                  </TouchableOpacity>
                  <Text style={styles.termsText}>'nı okudum ve kabul ediyorum.</Text>
                </Text>
              </View>
            </TouchableOpacity>

            <Pressable
              style={({ pressed }) => [
                styles.button,
                (loading || !acceptedTerms) && styles.buttonDisabled,
                pressed && { opacity: 0.8 }
              ]}
              onPress={handleSignup}
              disabled={loading || !acceptedTerms}
              role="button"
              accessibilityRole="button"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Kayıt Ol</Text>
              )}
            </Pressable>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Zaten hesabınız var mı?</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={styles.linkText}>Giriş Yap</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
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
  genderContainer: {
    marginTop: 8,
  },
  genderLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#374151',
    gap: 8,
  },
  genderOptionSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  genderText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  genderTextSelected: {
    color: '#fff',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  termsTextContainer: {
    flex: 1,
  },
  termsText: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 20,
  },
  termsLink: {
    color: '#6366f1',
    fontSize: 13,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  button: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  linkText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
  },
});
