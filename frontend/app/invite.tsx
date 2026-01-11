import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import api from '../src/services/api';
import { useAuth } from '../src/contexts/AuthContext';

export default function InviteScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const { communityId, groupId } = useLocalSearchParams<{ communityId?: string; groupId?: string }>();
  
  const [loading, setLoading] = useState(true);
  const [community, setCommunity] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [communityId, groupId]);

  const loadData = async () => {
    try {
      if (communityId) {
        const res = await api.get(`/api/communities/${communityId}`);
        setCommunity(res.data);
        // Davet linki oluştur
        setInviteLink(`https://networksolution.app/join/community/${communityId}`);
      }
      if (groupId) {
        const res = await api.get(`/api/subgroups/${groupId}`);
        setGroup(res.data);
        setInviteLink(`https://networksolution.app/join/group/${groupId}`);
      }
    } catch (error) {
      console.error('Error loading invite data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Alert.alert('Kopyalandı', 'Davet linki panoya kopyalandı');
  };

  const handleShare = async () => {
    try {
      const target = community?.name || group?.name || 'Network Solution';
      await Share.share({
        message: `${userProfile?.firstName || 'Bir arkadaşınız'} sizi ${target} topluluğuna davet ediyor! Katılmak için: ${inviteLink}`,
        title: `${target} Daveti`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleShareVia = (platform: string) => {
    const target = community?.name || group?.name || 'Network Solution';
    const message = encodeURIComponent(
      `${userProfile?.firstName || 'Bir arkadaşınız'} sizi ${target} topluluğuna davet ediyor! Katılmak için: ${inviteLink}`
    );

    let url = '';
    switch (platform) {
      case 'whatsapp':
        url = `whatsapp://send?text=${message}`;
        break;
      case 'telegram':
        url = `tg://msg?text=${message}`;
        break;
      case 'twitter':
        url = `twitter://post?message=${message}`;
        break;
      case 'email':
        url = `mailto:?subject=${encodeURIComponent(`${target} Daveti`)}&body=${message}`;
        break;
    }

    // Native sharing için Share.share kullanıyoruz
    handleShare();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  const targetName = community?.name || group?.name || 'Network Solution';
  const memberCount = community?.memberCount || group?.memberCount || 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Davet Et</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Target Info Card */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.targetCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.targetIcon}>
            <Ionicons name={community ? 'business' : 'people'} size={40} color="#fff" />
          </View>
          <Text style={styles.targetName}>{targetName}</Text>
          <Text style={styles.targetMeta}>{memberCount} üye</Text>
        </LinearGradient>

        {/* Invite Link */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Davet Linki</Text>
          <View style={styles.linkContainer}>
            <TextInput
              style={styles.linkInput}
              value={inviteLink}
              editable={false}
              selectTextOnFocus
            />
            <TouchableOpacity style={styles.copyButton} onPress={handleCopyLink}>
              <Ionicons name={copied ? 'checkmark' : 'copy'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Share Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Paylaş</Text>
          <View style={styles.shareGrid}>
            <TouchableOpacity style={styles.shareButton} onPress={() => handleShareVia('whatsapp')}>
              <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
                <Ionicons name="logo-whatsapp" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>WhatsApp</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={() => handleShareVia('telegram')}>
              <View style={[styles.shareIcon, { backgroundColor: '#0088cc' }]}>
                <Ionicons name="paper-plane" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>Telegram</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={() => handleShareVia('twitter')}>
              <View style={[styles.shareIcon, { backgroundColor: '#1DA1F2' }]}>
                <Ionicons name="logo-twitter" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>Twitter</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.shareButton} onPress={() => handleShareVia('email')}>
              <View style={[styles.shareIcon, { backgroundColor: '#ea4335' }]}>
                <Ionicons name="mail" size={28} color="#fff" />
              </View>
              <Text style={styles.shareLabel}>E-posta</Text>
            </TouchableOpacity>
          </View>

          {/* General Share Button */}
          <TouchableOpacity style={styles.generalShareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={22} color="#fff" />
            <Text style={styles.generalShareText}>Diğer Uygulamalarla Paylaş</Text>
          </TouchableOpacity>
        </View>

        {/* QR Code Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>QR Kod</Text>
          <View style={styles.qrPlaceholder}>
            <Ionicons name="qr-code" size={120} color="#374151" />
            <Text style={styles.qrText}>QR kod yakında aktif olacak</Text>
          </View>
        </View>

        {/* Tips */}
        <View style={styles.tipsSection}>
          <View style={styles.tipItem}>
            <Ionicons name="information-circle" size={20} color="#6366f1" />
            <Text style={styles.tipText}>Davet linki ile gelen kişiler otomatik olarak topluluğa katılır.</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="shield-checkmark" size={20} color="#10b981" />
            <Text style={styles.tipText}>Alt gruplara katılım için yönetici onayı gerekebilir.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { flex: 1 },
  targetCard: { margin: 16, borderRadius: 20, padding: 24, alignItems: 'center' },
  targetIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  targetName: { color: '#fff', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  targetMeta: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  section: { padding: 16 },
  sectionTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  linkContainer: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 12, overflow: 'hidden' },
  linkInput: { flex: 1, color: '#fff', paddingHorizontal: 16, paddingVertical: 14, fontSize: 14 },
  copyButton: { backgroundColor: '#6366f1', paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },
  shareGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  shareButton: { width: '23%', alignItems: 'center', marginBottom: 16 },
  shareIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  shareLabel: { color: '#9ca3af', fontSize: 12 },
  generalShareButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1f2937', paddingVertical: 14, borderRadius: 12, gap: 8, marginTop: 8 },
  generalShareText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  qrPlaceholder: { backgroundColor: '#111827', borderRadius: 16, padding: 32, alignItems: 'center' },
  qrText: { color: '#6b7280', fontSize: 14, marginTop: 16 },
  tipsSection: { padding: 16, gap: 12 },
  tipItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  tipText: { color: '#9ca3af', fontSize: 14, flex: 1, lineHeight: 20 },
});
