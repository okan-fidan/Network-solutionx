import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { VideoView, useVideoPlayer } from 'expo-video';
import { postApi, userListApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { incrementPostCount, shouldShowRatingPrompt, requestReview } from '../../src/utils/appRating';

interface User {
  uid: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

export default function CreatePostScreen() {
  const [content, setContent] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  
  // Mention state
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mentions, setMentions] = useState<string[]>([]);
  const [mentionedUsers, setMentionedUsers] = useState<User[]>([]);
  
  // Media type selector
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  
  const { userProfile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await userListApi.getAll();
      setUsers(response.data || []);
      setFilteredUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      setSelectedVideo(null); // Video varsa kaldır
    }
    setShowMediaOptions(false);
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Video seçmek için galeri izni gerekiyor.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
      videoMaxDuration: 60, // 60 saniye max
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedVideo(result.assets[0].uri);
      setSelectedImage(null); // Resim varsa kaldır
    }
    setShowMediaOptions(false);
  };

  const getLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum için izin gerekiyor.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const [address] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (address) {
        const locationString = [address.district, address.city, address.country]
          .filter(Boolean)
          .join(', ');
        setLocation(locationString);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Hata', 'Konum alınamadı');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleMentionSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = users.filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  };

  const handleSelectUser = (user: User) => {
    if (!mentions.includes(user.uid)) {
      setMentions([...mentions, user.uid]);
      setMentionedUsers([...mentionedUsers, user]);
      setContent(content + `@${user.firstName} `);
    }
    setShowMentionModal(false);
    setSearchQuery('');
    setFilteredUsers(users);
  };

  const removeMention = (uid: string) => {
    setMentions(mentions.filter((m) => m !== uid));
    setMentionedUsers(mentionedUsers.filter((u) => u.uid !== uid));
  };

  const handlePost = async () => {
    if (!content.trim()) {
      Alert.alert('Hata', 'Lütfen bir şeyler yazın');
      return;
    }

    setLoading(true);
    try {
      let imageUrl = null;
      let videoUrl = null;
      
      // Eğer resim seçildiyse base64'e dönüştür
      if (selectedImage) {
        try {
          const response = await fetch(selectedImage);
          const blob = await response.blob();
          const reader = new FileReader();
          imageUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imgError) {
          console.log('Image conversion error:', imgError);
        }
      }
      
      // Eğer video seçildiyse base64'e dönüştür
      if (selectedVideo) {
        try {
          const response = await fetch(selectedVideo);
          const blob = await response.blob();
          const reader = new FileReader();
          videoUrl = await new Promise((resolve, reject) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (vidError) {
          console.log('Video conversion error:', vidError);
        }
      }

      await postApi.create({
        content: content.trim(),
        imageUrl: imageUrl,
        videoUrl: videoUrl,
        location: location,
        mentions: mentions,
      });
      
      // Rating işlemleri - hata olursa devam et
      try {
        await incrementPostCount();
      } catch (e) {
        console.log('Rating increment error:', e);
      }
      
      Alert.alert('Başarılı', 'Gönderiniz paylaşıldı!', [
        { 
          text: 'Tamam', 
          onPress: () => router.back()
        }
      ]);
    } catch (error: any) {
      console.error('Error creating post:', error?.response?.data || error);
      Alert.alert('Hata', error?.response?.data?.detail || 'Gönderi paylaşılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Gönderi Oluştur</Text>
          <TouchableOpacity
            style={[styles.postButton, (!content.trim() || loading) && styles.postButtonDisabled]}
            onPress={handlePost}
            disabled={!content.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.postButtonText}>Paylaş</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              {userProfile?.profileImageUrl ? (
                <Image source={{ uri: userProfile.profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {userProfile?.firstName?.[0]}{userProfile?.lastName?.[0]}
                </Text>
              )}
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userProfile?.firstName} {userProfile?.lastName}</Text>
              <Text style={styles.visibility}>Herkese Açık</Text>
            </View>
          </View>

          {/* Mentioned Users */}
          {mentionedUsers.length > 0 && (
            <View style={styles.mentionedContainer}>
              <Text style={styles.mentionedLabel}>Etiketlenen:</Text>
              <View style={styles.mentionedList}>
                {mentionedUsers.map((user) => (
                  <View key={user.uid} style={styles.mentionedChip}>
                    <Text style={styles.mentionedName}>@{user.firstName}</Text>
                    <TouchableOpacity onPress={() => removeMention(user.uid)}>
                      <Ionicons name="close-circle" size={18} color="#6b7280" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Location Tag */}
          {location && (
            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="#6366f1" />
              <Text style={styles.locationText}>{location}</Text>
              <TouchableOpacity onPress={() => setLocation(null)}>
                <Ionicons name="close-circle" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Ne düşünüyorsun?"
            placeholderTextColor="#6b7280"
            value={content}
            onChangeText={setContent}
            multiline
            maxLength={2000}
            autoFocus
          />

          {selectedImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {selectedVideo && (
            <View style={styles.imagePreview}>
              <Video
                source={{ uri: selectedVideo }}
                style={styles.selectedImage}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
              />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => setSelectedVideo(null)}
              >
                <Ionicons name="close-circle" size={28} color="#fff" />
              </TouchableOpacity>
              <View style={styles.videoBadge}>
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.videoBadgeText}>Video</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarButton} onPress={() => setShowMediaOptions(true)}>
            <Ionicons name="images" size={24} color="#10b981" />
            <Text style={styles.toolbarText}>Medya</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton}
            onPress={getLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#f59e0b" />
            ) : (
              <Ionicons name="location" size={24} color={location ? '#6366f1' : '#f59e0b'} />
            )}
            <Text style={[styles.toolbarText, location && { color: '#6366f1' }]}>
              {location ? 'Konum Eklendi' : 'Konum'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton}
            onPress={() => setShowMentionModal(true)}
          >
            <Ionicons name="at" size={24} color={mentions.length > 0 ? '#6366f1' : '#6366f1'} />
            <Text style={styles.toolbarText}>
              {mentions.length > 0 ? `${mentions.length} Etiket` : 'Etiketle'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Mention Modal */}
      <Modal visible={showMentionModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kişi Etiketle</Text>
              <TouchableOpacity onPress={() => setShowMentionModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#6b7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="İsim ara..."
                placeholderTextColor="#6b7280"
                value={searchQuery}
                onChangeText={handleMentionSearch}
              />
            </View>

            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.userItem,
                    mentions.includes(item.uid) && styles.userItemSelected,
                  ]}
                  onPress={() => handleSelectUser(item)}
                >
                  <View style={styles.userItemAvatar}>
                    {item.profileImageUrl ? (
                      <Image source={{ uri: item.profileImageUrl }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons name="person" size={18} color="#9ca3af" />
                    )}
                  </View>
                  <Text style={styles.userItemName}>
                    {item.firstName} {item.lastName}
                  </Text>
                  {mentions.includes(item.uid) && (
                    <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>Kullanıcı bulunamadı</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Media Options Modal */}
      <Modal visible={showMediaOptions} animationType="fade" transparent>
        <TouchableOpacity 
          style={styles.mediaOptionsOverlay}
          activeOpacity={1}
          onPress={() => setShowMediaOptions(false)}
        >
          <View style={styles.mediaOptionsContent}>
            <Text style={styles.mediaOptionsTitle}>Medya Ekle</Text>
            <TouchableOpacity style={styles.mediaOption} onPress={pickImage}>
              <View style={[styles.mediaOptionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="image" size={24} color="#10b981" />
              </View>
              <View style={styles.mediaOptionInfo}>
                <Text style={styles.mediaOptionTitle}>Fotoğraf</Text>
                <Text style={styles.mediaOptionSubtitle}>Galeriden fotoğraf seç</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaOption} onPress={pickVideo}>
              <View style={[styles.mediaOptionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                <Ionicons name="videocam" size={24} color="#6366f1" />
              </View>
              <View style={styles.mediaOptionInfo}>
                <Text style={styles.mediaOptionTitle}>Video</Text>
                <Text style={styles.mediaOptionSubtitle}>60 saniyeye kadar video</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.mediaOptionCancel}
              onPress={() => setShowMediaOptions(false)}
            >
              <Text style={styles.mediaOptionCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  postButton: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  userSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#4338ca', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  userInfo: { marginLeft: 12 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  visibility: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  mentionedContainer: { marginBottom: 12 },
  mentionedLabel: { color: '#9ca3af', fontSize: 13, marginBottom: 8 },
  mentionedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mentionedChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, gap: 6 },
  mentionedName: { color: '#6366f1', fontSize: 14 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 12, gap: 8 },
  locationText: { color: '#6366f1', fontSize: 14, flex: 1 },
  input: { color: '#fff', fontSize: 18, lineHeight: 26, minHeight: 120 },
  imagePreview: { marginTop: 16, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  selectedImage: { width: '100%', height: 250, borderRadius: 16 },
  removeImageButton: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 14 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  toolbarButton: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolbarText: { color: '#9ca3af', fontSize: 14 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', margin: 16, borderRadius: 12, paddingHorizontal: 12, height: 44, gap: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 16 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  userItemSelected: { backgroundColor: 'rgba(99, 102, 241, 0.1)' },
  userItemAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 },
  userItemName: { flex: 1, color: '#fff', fontSize: 15 },
  emptyList: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#6b7280', fontSize: 15 },
  // Video styles
  videoBadge: { position: 'absolute', bottom: 8, left: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
  videoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  // Media options modal
  mediaOptionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  mediaOptionsContent: { backgroundColor: '#1f2937', borderRadius: 20, width: '100%', maxWidth: 340, padding: 20 },
  mediaOptionsTitle: { color: '#fff', fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  mediaOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  mediaOptionIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  mediaOptionInfo: { flex: 1, marginLeft: 14 },
  mediaOptionTitle: { color: '#fff', fontSize: 16, fontWeight: '500' },
  mediaOptionSubtitle: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  mediaOptionCancel: { marginTop: 16, padding: 14, backgroundColor: '#374151', borderRadius: 12, alignItems: 'center' },
  mediaOptionCancelText: { color: '#9ca3af', fontSize: 15, fontWeight: '500' },
});
