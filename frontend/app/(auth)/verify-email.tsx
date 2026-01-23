import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { sendEmailVerification, reload } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { useAuth } from '../../src/contexts/AuthContext';

export default function VerifyEmailScreen() {
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Periyodik olarak doğrulama durumunu kontrol et
  useEffect(() => {
    const checkVerification = async () => {
      if (auth.currentUser) {
        try {
          await reload(auth.currentUser);
          if (auth.currentUser.emailVerified) {
            // Email doğrulandı, profil sayfasına git
            router.replace('/(auth)/register-profile');
          }
        } catch (error) {
          console.log('Check verification error:', error);
        }
      }
    };

    // Her 5 saniyede bir kontrol et
    const interval = setInterval(checkVerification, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResendEmail = async () => {
    if (countdown > 0) return;
    
    setResending(true);
    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        Alert.alert(
          'Başarılı',
          'Doğrulama emaili tekrar gönderildi. Lütfen gelen kutunuzu kontrol edin.',
          [{ text: 'Tamam' }]
        );
        setCountdown(60); // 60 saniye beklet
      }
    } catch (error: any) {
      console.error('Resend email error:', error);
      let message = 'Email gönderilemedi';
      if (error?.code === 'auth/too-many-requests') {
        message = 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
      }
      Alert.alert('Hata', message);
    } finally {
      setResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      if (auth.currentUser) {
        await reload(auth.currentUser);
        if (auth.currentUser.emailVerified) {
          // Email doğrulandı
          router.replace('/(auth)/register-profile');
        } else {
          Alert.alert(
            'Henüz Doğrulanmadı',
            'Email adresiniz henüz doğrulanmadı. Lütfen gelen kutunuzu kontrol edin ve doğrulama linkine tıklayın.',
            [{ text: 'Tamam' }]
          );
        }
      }
    } catch (error) {
      console.error('Check verification error:', error);
      Alert.alert('Hata', 'Doğrulama durumu kontrol edilemedi');
    } finally {
      setChecking(false);
    }
  };

  const handleChangeEmail = async () => {
    Alert.alert(
      'Farklı Email Kullan',
      'Farklı bir email adresi ile kayıt olmak için çıkış yapmanız gerekmektedir.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Çıkış Yap', 
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/signup');
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread" size={60} color="#6366f1" />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Email Doğrulama</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.emailText}>{user?.email}</Text> adresine bir doğrulama emaili gönderdik.
        </Text>

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <View style={styles.instructionItem}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>1</Text>
            </View>
            <Text style={styles.instructionText}>Gelen kutunuzu kontrol edin</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>2</Text>
            </View>
            <Text style={styles.instructionText}>Doğrulama linkine tıklayın</Text>
          </View>
          <View style={styles.instructionItem}>
            <View style={styles.numberBadge}>
              <Text style={styles.numberText}>3</Text>
            </View>
            <Text style={styles.instructionText}>Bu sayfaya geri dönün</Text>
          </View>
        </View>

        {/* Spam uyarısı */}
        <View style={styles.spamWarning}>
          <Ionicons name="information-circle" size={20} color="#f59e0b" />
          <Text style={styles.spamText}>
            Email gelmedi mi? Spam/Gereksiz klasörünü kontrol edin.
          </Text>
        </View>

        {/* Check Verification Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCheckVerification}
          disabled={checking}
        >
          {checking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>Doğruladım, Devam Et</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Resend Button */}
        <TouchableOpacity
          style={[styles.secondaryButton, countdown > 0 && styles.buttonDisabled]}
          onPress={handleResendEmail}
          disabled={resending || countdown > 0}
        >
          {resending ? (
            <ActivityIndicator color="#6366f1" />
          ) : (
            <>
              <Ionicons name="refresh" size={20} color={countdown > 0 ? '#6b7280' : '#6366f1'} />
              <Text style={[styles.secondaryButtonText, countdown > 0 && styles.textDisabled]}>
                {countdown > 0 ? `Tekrar Gönder (${countdown}s)` : 'Tekrar Gönder'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Change Email Button */}
        <TouchableOpacity
          style={styles.textButton}
          onPress={handleChangeEmail}
        >
          <Text style={styles.textButtonText}>Farklı email kullan</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emailText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  instructionsBox: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  numberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    color: '#e5e7eb',
    fontSize: 15,
    flex: 1,
  },
  spamWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 28,
    gap: 10,
  },
  spamText: {
    color: '#f59e0b',
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: '#6366f1',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    height: 52,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    borderColor: '#374151',
  },
  textDisabled: {
    color: '#6b7280',
  },
  textButton: {
    padding: 12,
  },
  textButtonText: {
    color: '#9ca3af',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
});
