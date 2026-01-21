import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { postApi, communityApi, storyApi } from '../../src/services/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { LinearGradient } from 'expo-linear-gradient';
import { AdBanner } from '../../src/components/ads';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

interface Post {
  id: string;
  userId: string;
  userName: string;
  userProfileImage?: string;
  content: string;
  imageUrl?: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  timestamp: string;
}

interface Story {
  userId: string;
  userName: string;
  userProfileImage?: string;
  stories: {
    id: string;
    imageUrl?: string;
    videoUrl?: string;
    caption?: string;
    createdAt: string;
    viewCount: number;
    hasViewed: boolean;
  }[];
  hasViewed: boolean;
}

interface Announcement {
  id: string;
  content: string;
  communityName: string;
  communityId: string;
  timestamp: string;
}

// Skeleton Loading Component
const SkeletonPost = () => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonHeader}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.skeletonHeaderInfo}>
        <View style={styles.skeletonName} />
        <View style={styles.skeletonTime} />
      </View>
    </View>
    <View style={styles.skeletonContent} />
    <View style={styles.skeletonContentShort} />
    <View style={styles.skeletonActions} />
  </View>
);

// Stories Component - Sadece kullanıcı hikayeleri (24 saat sonra otomatik silinir)
const StoriesSection = ({ stories, onStoryPress, onAddStory }: { 
  stories: Story[], 
  onStoryPress: (story: Story) => void,
  onAddStory: () => void 
}) => (
  <View style={styles.storiesContainer}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesScroll}>
      {/* Add Story Button */}
      <TouchableOpacity style={styles.storyItem} onPress={onAddStory}>
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          style={styles.addStoryCircle}
        >
          <View style={styles.addStoryInner}>
            <Ionicons name="add" size={28} color="#6366f1" />
          </View>
        </LinearGradient>
        <Text style={styles.storyName} numberOfLines={1}>Hikaye Ekle</Text>
      </TouchableOpacity>

      {/* User Stories Only */}
      {stories.map((story) => (
        <TouchableOpacity 
          key={story.userId} 
          style={styles.storyItem}
          onPress={() => onStoryPress(story)}
        >
          <LinearGradient
            colors={!story.hasViewed ? ['#f59e0b', '#ef4444', '#ec4899'] : ['#374151', '#374151']}
            style={styles.storyCircle}
          >
            <View style={styles.storyImageContainer}>
              {story.userProfileImage ? (
                <Image source={{ uri: story.userProfileImage }} style={styles.storyImage} />
              ) : (
                <View style={styles.storyPlaceholder}>
                  <Ionicons name="person" size={24} color="#9ca3af" />
                </View>
              )}
            </View>
          </LinearGradient>
          <Text style={styles.storyName} numberOfLines={1}>{story.userName}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);

// Welcome Card Component (for new users)
const WelcomeCard = ({ userProfile, onDismiss, router }: { 
  userProfile: any, 
  onDismiss: () => void,
  router: any 
}) => {
  const steps = [
    { id: 'profile', label: 'Profili Tamamla', icon: 'person', done: !!userProfile?.firstName },
    { id: 'community', label: 'Topluluğa Katıl', icon: 'people', done: (userProfile?.communities?.length || 0) > 0 },
    { id: 'post', label: 'İlk Gönderi', icon: 'create', done: false },
  ];
  
  const completedSteps = steps.filter(s => s.done).length;
  const progress = (completedSteps / steps.length) * 100;

  return (
    <View style={styles.welcomeCard}>
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.welcomeGradient}
      >
        <TouchableOpacity style={styles.welcomeClose} onPress={onDismiss}>
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        
        <View style={styles.welcomeHeader}>
          <Text style={styles.welcomeEmoji}>👋</Text>
          <View>
            <Text style={styles.welcomeTitle}>Hoş Geldin{userProfile?.firstName ? `, ${userProfile.firstName}` : ''}!</Text>
            <Text style={styles.welcomeSubtitle}>Hadi başlayalım</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{completedSteps}/{steps.length} tamamlandı</Text>
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <TouchableOpacity 
              key={step.id}
              style={[styles.stepItem, step.done && styles.stepDone]}
              onPress={() => {
                if (step.id === 'profile') router.push('/(tabs)/profile');
                if (step.id === 'community') router.push('/(tabs)/communities');
                if (step.id === 'post') router.push('/post/create');
              }}
            >
              <View style={[styles.stepIcon, step.done && styles.stepIconDone]}>
                {step.done ? (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                ) : (
                  <Ionicons name={step.icon as any} size={16} color="rgba(255,255,255,0.7)" />
                )}
              </View>
              <Text style={[styles.stepLabel, step.done && styles.stepLabelDone]}>{step.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </View>
  );
};

// Announcement Banner Component
const AnnouncementBanner = ({ announcement, onPress, onDismiss }: {
  announcement: Announcement,
  onPress: () => void,
  onDismiss: () => void
}) => (
  <TouchableOpacity style={styles.announcementBanner} onPress={onPress} activeOpacity={0.9}>
    <LinearGradient
      colors={['#f59e0b', '#d97706']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.announcementGradient}
    >
      <View style={styles.announcementIcon}>
        <Ionicons name="megaphone" size={20} color="#fff" />
      </View>
      <View style={styles.announcementContent}>
        <Text style={styles.announcementCommunity}>{announcement.communityName}</Text>
        <Text style={styles.announcementText} numberOfLines={1}>{announcement.content}</Text>
      </View>
      <TouchableOpacity style={styles.announcementClose} onPress={onDismiss}>
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
      </TouchableOpacity>
    </LinearGradient>
  </TouchableOpacity>
);

// Quick Actions Component
const QuickActions = ({ router }: { router: any }) => (
  <View style={styles.quickActionsContainer}>
    <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/chat/new')}>
      <LinearGradient colors={['#10b981', '#059669']} style={styles.quickActionIcon}>
        <Ionicons name="chatbubble" size={20} color="#fff" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>Sohbet</Text>
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/(tabs)/communities')}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.quickActionIcon}>
        <Ionicons name="people" size={20} color="#fff" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>Topluluklar</Text>
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/service/create')}>
      <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.quickActionIcon}>
        <Ionicons name="briefcase" size={20} color="#fff" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>Hizmet</Text>
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.quickActionItem} onPress={() => router.push('/search')}>
      <LinearGradient colors={['#ec4899', '#db2777']} style={styles.quickActionIcon}>
        <Ionicons name="search" size={20} color="#fff" />
      </LinearGradient>
      <Text style={styles.quickActionLabel}>Keşfet</Text>
    </TouchableOpacity>
  </View>
);

export default function HomeScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pinnedPosts, setPinnedPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false); // AsyncStorage'dan kontrol edilecek
  const [welcomeDismissed, setWelcomeDismissed] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  
  // Story States - Instagram tarzı
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyCaption, setStoryCaption] = useState('');
  const [selectedStoryImage, setSelectedStoryImage] = useState<string | null>(null);
  const [selectedStoryVideo, setSelectedStoryVideo] = useState<string | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [storyPaused, setStoryPaused] = useState(false);
  
  // Story interaction states
  const [showStoryReply, setShowStoryReply] = useState(false);
  const [storyReplyText, setStoryReplyText] = useState('');
  const [showStoryOptions, setShowStoryOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sendingReaction, setSendingReaction] = useState(false);
  
  const { userProfile, user } = useAuth();
  const router = useRouter();
  
  // Admin kontrolü
  const isGlobalAdmin = userProfile?.isAdmin === true || userProfile?.email?.toLowerCase() === 'metaticaretim@gmail.com';

  // Profil tamamlama kontrolü - Sadece bir kez göster
  const isProfileComplete = userProfile?.firstName && 
                           userProfile?.lastName && 
                           (userProfile?.communities?.length || 0) > 0;

  const loadData = useCallback(async () => {
    try {
      // Posts yükle
      const postsResponse = await postApi.getAll();
      setPosts(postsResponse.data || []);

      // Kullanıcı hikayelerini yükle (24 saatten eski olanlar backend'de otomatik silinir)
      try {
        const storiesResponse = await storyApi.getAll();
        setStories(storiesResponse.data || []);
      } catch (e) {
        console.log('Stories load error:', e);
        setStories([]);
      }

      // Duyurular için toplulukları yükle
      try {
        const communitiesResponse = await communityApi.getAll();
        // Son duyuruyu al
        const memberCommunities = (communitiesResponse.data || []).filter((c: any) => c.isMember);
        if (memberCommunities.length > 0) {
          try {
            const announcementRes = await communityApi.getAnnouncements(memberCommunities[0].id);
            if (announcementRes.data && announcementRes.data.length > 0) {
              const latestAnnouncement = announcementRes.data[0];
              setAnnouncement({
                id: latestAnnouncement.id,
                content: latestAnnouncement.content,
                communityName: memberCommunities[0].name,
                communityId: memberCommunities[0].id,
                timestamp: latestAnnouncement.timestamp,
              });
            }
          } catch (e) {
            // Duyuru yükleme hatası sessizce geç
          }
        }
      } catch (e) {
        // Topluluk yükleme hatası
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sayfa odaklandığında veriyi yenile (silme sonrası otomatik güncelleme için)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Hikaye fonksiyonları
  const handleStoryPress = async (story: Story) => {
    setCurrentStory(story);
    setCurrentStoryIndex(0);
    setStoryProgress(0);
    setShowStoryViewer(true);
    
    // Hikayeyi görüntülenmiş olarak işaretle
    if (story.stories.length > 0) {
      try {
        await storyApi.view(story.stories[0].id);
      } catch (e) {
        console.log('Story view error:', e);
      }
    }
  };

  const handleNextStory = async () => {
    if (!currentStory) return;
    
    if (currentStoryIndex < currentStory.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setStoryProgress(0);
      
      try {
        await storyApi.view(currentStory.stories[nextIndex].id);
      } catch (e) {
        console.log('Story view error:', e);
      }
    } else {
      // Sonraki kullanıcının hikayesine geç
      const currentUserIndex = stories.findIndex(s => s.userId === currentStory.userId);
      if (currentUserIndex < stories.length - 1) {
        const nextUserStory = stories[currentUserIndex + 1];
        setCurrentStory(nextUserStory);
        setCurrentStoryIndex(0);
        setStoryProgress(0);
        
        if (nextUserStory.stories.length > 0) {
          try {
            await storyApi.view(nextUserStory.stories[0].id);
          } catch (e) {
            console.log('Story view error:', e);
          }
        }
      } else {
        setShowStoryViewer(false);
      }
    }
  };

  const handlePrevStory = () => {
    if (!currentStory) return;
    
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setStoryProgress(0);
    } else {
      // Önceki kullanıcının hikayesine geç
      const currentUserIndex = stories.findIndex(s => s.userId === currentStory.userId);
      if (currentUserIndex > 0) {
        const prevUserStory = stories[currentUserIndex - 1];
        setCurrentStory(prevUserStory);
        setCurrentStoryIndex(prevUserStory.stories.length - 1);
        setStoryProgress(0);
      }
    }
  };

  // Instagram tarzı hikaye ekleme - Fotoğraf veya Video
  const handleAddStory = () => {
    Alert.alert(
      'Hikaye Ekle',
      'Ne paylaşmak istersiniz?',
      [
        {
          text: '📷 Fotoğraf',
          onPress: () => pickStoryMedia('photo'),
        },
        {
          text: '🎥 Video',
          onPress: () => pickStoryMedia('video'),
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ]
    );
  };

  const pickStoryMedia = async (type: 'photo' | 'video') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'photo' 
        ? ImagePicker.MediaTypeOptions.Images 
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
      base64: true,
      videoMaxDuration: 30, // Max 30 saniye video
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'photo') {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSelectedStoryImage(base64Image);
        setSelectedStoryVideo(null);
      } else {
        setSelectedStoryVideo(result.assets[0].uri);
        setSelectedStoryImage(null);
      }
      setShowStoryCreator(true);
    }
  };

  const handleCreateStory = async () => {
    if (!selectedStoryImage && !selectedStoryVideo) return;
    
    setUploadingStory(true);
    try {
      await storyApi.create({
        imageUrl: selectedStoryImage || undefined,
        videoUrl: selectedStoryVideo || undefined,
        caption: storyCaption,
      });
      
      Toast.show({
        type: 'success',
        text1: 'Başarılı',
        text2: 'Hikaye paylaşıldı (24 saat sonra otomatik silinecek)',
      });
      
      setShowStoryCreator(false);
      setSelectedStoryImage(null);
      setSelectedStoryVideo(null);
      setStoryCaption('');
      loadData();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Hikaye paylaşılamadı',
      });
    } finally {
      setUploadingStory(false);
    }
  };

  // Instagram tarzı emoji tepkisi
  const handleStoryReaction = async (emoji: string) => {
    if (!currentStory || sendingReaction) return;
    
    const storyItem = currentStory.stories[currentStoryIndex];
    if (!storyItem) return;
    
    setSendingReaction(true);
    try {
      await storyApi.react(storyItem.id, emoji);
      Toast.show({
        type: 'success',
        text1: `${emoji} gönderildi`,
        position: 'bottom',
        visibilityTime: 1500,
      });
      setShowEmojiPicker(false);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Tepki gönderilemedi',
      });
    } finally {
      setSendingReaction(false);
    }
  };

  // Instagram tarzı hikaye yanıtlama
  const handleStoryReply = async () => {
    if (!currentStory || !storyReplyText.trim()) return;
    
    const storyItem = currentStory.stories[currentStoryIndex];
    if (!storyItem) return;
    
    try {
      await storyApi.reply(storyItem.id, storyReplyText.trim());
      Toast.show({
        type: 'success',
        text1: 'Yanıt gönderildi ✉️',
        text2: 'Mesajlar bölümünden görebilirsiniz',
      });
      setStoryReplyText('');
      setShowStoryReply(false);
      setStoryPaused(false);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Yanıt gönderilemedi',
      });
    }
  };

  // Hikayeyi şikayet et
  const handleReportStory = () => {
    if (!currentStory) return;
    
    Alert.alert(
      'Hikayeyi Şikayet Et',
      'Şikayet nedeninizi seçin:',
      [
        { text: 'Uygunsuz İçerik', onPress: () => submitStoryReport('Uygunsuz içerik') },
        { text: 'Spam', onPress: () => submitStoryReport('Spam') },
        { text: 'Nefret Söylemi', onPress: () => submitStoryReport('Nefret söylemi') },
        { text: 'Şiddet', onPress: () => submitStoryReport('Şiddet içerikli') },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  const submitStoryReport = async (reason: string) => {
    if (!currentStory) return;
    
    const storyItem = currentStory.stories[currentStoryIndex];
    if (!storyItem) return;
    
    try {
      await storyApi.report(storyItem.id, reason);
      Toast.show({
        type: 'success',
        text1: 'Şikayet Alındı',
        text2: 'İnceleme sonucu size bildirilecektir',
      });
      setShowStoryOptions(false);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: error.response?.data?.detail || 'Şikayet gönderilemedi',
      });
    }
  };

  // Kullanıcıyı engelle
  const handleBlockUser = () => {
    if (!currentStory) return;
    
    Alert.alert(
      'Kullanıcıyı Engelle',
      `${currentStory.userName} adlı kullanıcıyı engellemek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Engelle', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Block user API call
              Toast.show({
                type: 'success',
                text1: 'Kullanıcı Engellendi',
                text2: 'Bu kullanıcının hikayelerini artık görmeyeceksiniz',
              });
              setShowStoryViewer(false);
              setShowStoryOptions(false);
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: 'Kullanıcı engellenemedi',
              });
            }
          }
        },
      ]
    );
  };

  // Hikayeyi sil (kendi hikayem)
  const handleDeleteStory = async () => {
    if (!currentStory) return;
    
    const storyItem = currentStory.stories[currentStoryIndex];
    if (!storyItem) return;
    
    Alert.alert(
      'Hikayeyi Sil',
      'Bu hikayeyi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await storyApi.delete(storyItem.id);
              Toast.show({
                type: 'success',
                text1: 'Hikaye Silindi',
              });
              
              // Bir sonraki hikayeye geç veya kapat
              if (currentStory.stories.length <= 1) {
                setShowStoryViewer(false);
                loadData(); // Hikayeleri yenile
              } else {
                // Sonraki hikayeye geç
                if (currentStoryIndex < currentStory.stories.length - 1) {
                  handleNextStory();
                } else {
                  setCurrentStoryIndex(currentStoryIndex - 1);
                }
                loadData();
              }
              setShowStoryOptions(false);
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Hata',
                text2: error.response?.data?.detail || 'Hikaye silinemedi',
              });
            }
          }
        }
      ]
    );
  };

  // Hikaye progress timer (pause desteği ile)
  useEffect(() => {
    if (showStoryViewer && currentStory && !storyPaused && !showStoryReply && !showEmojiPicker) {
      const timer = setInterval(() => {
        setStoryProgress(prev => {
          if (prev >= 100) {
            handleNextStory();
            return 0;
          }
          return prev + 2;
        });
      }, 100);
      
      return () => clearInterval(timer);
    }
  }, [showStoryViewer, currentStory, currentStoryIndex, storyPaused, showStoryReply, showEmojiPicker]);

  const handleLike = async (postId: string) => {
    try {
      const response = await postApi.like(postId);
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, isLiked: response.data.liked, likeCount: response.data.likeCount }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await postApi.delete(postId);
      // Gönderiyi listeden kaldır
      setPosts(posts.filter(post => post.id !== postId));
      Toast.show({
        type: 'success',
        text1: 'Başarılı',
        text2: 'Gönderi silindi',
      });
    } catch (error: any) {
      console.error('Error deleting post:', error);
      const errorMsg = error.response?.data?.detail || 'Gönderi silinemedi';
      Toast.show({
        type: 'error',
        text1: 'Hata',
        text2: errorMsg,
      });
    }
  };

  const showPostOptions = (item: Post) => {
    const isOwner = user && item.userId === user.uid;
    const isAdmin = userProfile?.isAdmin === true;
    const canDelete = isOwner || isAdmin;

    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [];

    // Görüntüle seçeneği
    options.push({ 
      text: 'Görüntüle', 
      onPress: () => router.push(`/post/${item.id}`)
    });

    // Profili görüntüle
    if (!isOwner) {
      options.push({ 
        text: 'Profili Görüntüle', 
        onPress: () => router.push(`/user/${item.userId}`)
      });
    }

    // Silme seçeneği (sadece sahip veya admin için)
    if (canDelete) {
      options.push({
        text: isOwner ? 'Gönderiyi Sil' : 'Gönderiyi Sil (Admin)',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Gönderiyi Sil',
            'Bu gönderiyi silmek istediğinizden emin misiniz?',
            [
              { text: 'İptal', style: 'cancel' },
              { 
                text: 'Sil', 
                style: 'destructive',
                onPress: () => handleDeletePost(item.id)
              },
            ]
          );
        }
      });
    }

    // Bildir seçeneği (sadece başkalarının gönderileri için)
    if (!isOwner) {
      options.push({ 
        text: 'Bildir', 
        onPress: () => {
          Toast.show({
            type: 'info',
            text1: 'Bildirildi',
            text2: 'Gönderi incelenmek üzere bildirildi',
          });
        }
      });
    }

    options.push({ text: 'İptal', style: 'cancel' });

    Alert.alert(
      'Gönderi Seçenekleri',
      '',
      options
    );
  };

  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: tr });
    } catch {
      return '';
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <TouchableOpacity 
        style={styles.postHeader}
        onPress={() => router.push(`/user/${item.userId}`)}
      >
        <View style={styles.avatar}>
          {item.userProfileImage ? (
            <Image source={{ uri: item.userProfileImage }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={20} color="#9ca3af" />
          )}
        </View>
        <View style={styles.postHeaderInfo}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={styles.postTime}>{formatTime(item.timestamp)}</Text>
        </View>
        <TouchableOpacity 
          style={styles.moreButton}
          onPress={() => showPostOptions(item)}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="#6b7280" />
        </TouchableOpacity>
      </TouchableOpacity>

      <Text style={styles.postContent}>{item.content}</Text>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
      )}

      <View style={styles.postActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Ionicons 
            name={item.isLiked ? 'heart' : 'heart-outline'} 
            size={24} 
            color={item.isLiked ? '#ef4444' : '#6b7280'} 
          />
          <Text style={[styles.actionText, item.isLiked && styles.likedText]}>
            {item.likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push(`/post/${item.id}`)}
        >
          <Ionicons name="chatbubble-outline" size={22} color="#6b7280" />
          <Text style={styles.actionText}>{item.commentCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => Alert.alert('Paylaş', 'Bu gönderiyi paylaşmak istiyor musunuz?', [
            { text: 'İptal', style: 'cancel' },
            { text: 'Paylaş', onPress: () => Alert.alert('Başarılı', 'Gönderi paylaşıldı') },
          ])}
        >
          <Ionicons name="share-outline" size={22} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const ListHeader = () => (
    <>
      {/* Stories */}
      <StoriesSection 
        stories={stories} 
        onStoryPress={handleStoryPress}
        onAddStory={handleAddStory}
      />

      {/* Announcement Banner */}
      {showAnnouncement && announcement && (
        <AnnouncementBanner 
          announcement={announcement}
          onPress={() => router.push(`/community/${announcement.communityId}`)}
          onDismiss={() => setShowAnnouncement(false)}
        />
      )}

      {/* AdMob Banner */}
      <AdBanner style={{ marginVertical: 8 }} />

      {/* Welcome Card (for new users or incomplete profile) */}
      {showWelcome && userProfile && (userProfile.communities?.length || 0) < 2 && (
        <WelcomeCard 
          userProfile={userProfile} 
          onDismiss={() => setShowWelcome(false)}
          router={router}
        />
      )}

      {/* Quick Actions */}
      <QuickActions router={router} />

      {/* Quick Post */}
      <TouchableOpacity 
        style={styles.quickPost}
        onPress={() => router.push('/post/create')}
      >
        <View style={styles.quickPostAvatar}>
          {userProfile?.profileImageUrl ? (
            <Image source={{ uri: userProfile.profileImageUrl }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={18} color="#9ca3af" />
          )}
        </View>
        <Text style={styles.quickPostText}>Ne düşünüyorsun?</Text>
        <View style={styles.quickPostActions}>
          <TouchableOpacity style={styles.quickPostButton}>
            <Ionicons name="image" size={22} color="#10b981" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Network Solution</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/search')}
          >
            <Ionicons name="search" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView>
          <View style={styles.skeletonStories}>
            {[1,2,3,4,5].map(i => (
              <View key={i} style={styles.skeletonStoryItem} />
            ))}
          </View>
          {[1, 2, 3].map(i => <SkeletonPost key={i} />)}
        </ScrollView>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.postsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="newspaper-outline" size={48} color="#6366f1" />
              </View>
              <Text style={styles.emptyText}>Henüz gönderi yok</Text>
              <Text style={styles.emptySubtext}>İlk gönderiyi paylaşan sen ol!</Text>
              <TouchableOpacity 
                style={styles.emptyButton}
                onPress={() => router.push('/post/create')}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.emptyButtonText}>Gönderi Paylaş</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Story Viewer Modal - Instagram Tarzı */}
      <Modal
        visible={showStoryViewer}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowStoryViewer(false)}
      >
        <View style={styles.storyViewerContainer}>
          {currentStory && currentStory.stories[currentStoryIndex] && (
            <>
              {/* Progress Bars */}
              <View style={styles.storyProgressContainer}>
                {currentStory.stories.map((_, index) => (
                  <View key={index} style={styles.storyProgressBarBg}>
                    <View 
                      style={[
                        styles.storyProgressBar, 
                        { 
                          width: index < currentStoryIndex 
                            ? '100%' 
                            : index === currentStoryIndex 
                              ? `${storyProgress}%` 
                              : '0%' 
                        }
                      ]} 
                    />
                  </View>
                ))}
              </View>

              {/* Header */}
              <View style={styles.storyViewerHeader}>
                <TouchableOpacity 
                  style={styles.storyUserInfo}
                  onPress={() => {
                    setShowStoryViewer(false);
                    router.push(`/user/${currentStory.userId}`);
                  }}
                >
                  {currentStory.userProfileImage ? (
                    <Image source={{ uri: currentStory.userProfileImage }} style={styles.storyViewerAvatar} />
                  ) : (
                    <View style={[styles.storyViewerAvatar, { backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="person" size={20} color="#9ca3af" />
                    </View>
                  )}
                  <View>
                    <Text style={styles.storyViewerName}>{currentStory.userName}</Text>
                    <Text style={styles.storyViewerTime}>
                      {formatDistanceToNow(new Date(currentStory.stories[currentStoryIndex].createdAt), { addSuffix: true, locale: tr })}
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* Kendi hikayem - Silme butonu */}
                  {currentStory.userId === user?.uid && (
                    <TouchableOpacity onPress={() => setShowStoryOptions(true)}>
                      <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  {/* Başkasının hikayesi - Şikayet/Engelle */}
                  {currentStory.userId !== user?.uid && (
                    <TouchableOpacity onPress={() => setShowStoryOptions(true)}>
                      <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => setShowStoryViewer(false)}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Story Image */}
              <Image 
                source={{ uri: currentStory.stories[currentStoryIndex].imageUrl }}
                style={styles.storyViewerImage}
                resizeMode="contain"
              />

              {/* Caption */}
              {currentStory.stories[currentStoryIndex].caption ? (
                <View style={styles.storyCaption}>
                  <Text style={styles.storyCaptionText}>{currentStory.stories[currentStoryIndex].caption}</Text>
                </View>
              ) : null}

              {/* Instagram Tarzı Alt Kısım - Emoji ve Yanıtla */}
              {currentStory.userId !== user?.uid && !showStoryReply && (
                <View style={styles.storyBottomActions}>
                  {/* Emoji Tepkiler */}
                  <View style={styles.storyEmojiRow}>
                    {['❤️', '😂', '😮', '😢', '👏', '🔥'].map((emoji) => (
                      <TouchableOpacity 
                        key={emoji}
                        style={styles.storyEmojiBtn}
                        onPress={() => handleStoryReaction(emoji)}
                        disabled={sendingReaction}
                      >
                        <Text style={styles.storyEmoji}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Yanıtla Butonu */}
                  <TouchableOpacity 
                    style={styles.storyReplyButton}
                    onPress={() => {
                      setStoryPaused(true);
                      setShowStoryReply(true);
                    }}
                  >
                    <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                    <Text style={styles.storyReplyButtonText}>Yanıtla...</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Yanıt Input */}
              {showStoryReply && (
                <View style={styles.storyReplyContainer}>
                  <TextInput
                    style={styles.storyReplyInput}
                    placeholder={`${currentStory.userName} adlı kişiye yanıt...`}
                    placeholderTextColor="#9ca3af"
                    value={storyReplyText}
                    onChangeText={setStoryReplyText}
                    autoFocus
                    onBlur={() => {
                      if (!storyReplyText.trim()) {
                        setShowStoryReply(false);
                        setStoryPaused(false);
                      }
                    }}
                  />
                  <TouchableOpacity 
                    style={[styles.storyReplySendBtn, !storyReplyText.trim() && { opacity: 0.5 }]}
                    onPress={handleStoryReply}
                    disabled={!storyReplyText.trim()}
                  >
                    <Ionicons name="send" size={22} color="#6366f1" />
                  </TouchableOpacity>
                </View>
              )}

              {/* Touch Areas */}
              <TouchableOpacity 
                style={styles.storyTouchLeft} 
                onPress={handlePrevStory}
                onLongPress={() => setStoryPaused(true)}
                onPressOut={() => setStoryPaused(false)}
                activeOpacity={1}
              />
              <TouchableOpacity 
                style={styles.storyTouchRight} 
                onPress={handleNextStory}
                onLongPress={() => setStoryPaused(true)}
                onPressOut={() => setStoryPaused(false)}
                activeOpacity={1}
              />
            </>
          )}
        </View>
      </Modal>

      {/* Story Options Modal - Kendi hikayem veya başkasının hikayesi */}
      <Modal
        visible={showStoryOptions}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStoryOptions(false)}
      >
        <TouchableOpacity 
          style={styles.storyOptionsOverlay}
          activeOpacity={1}
          onPress={() => setShowStoryOptions(false)}
        >
          <View style={styles.storyOptionsContainer}>
            <View style={styles.storyOptionsHandle} />
            
            {/* Kendi hikayem - Silme seçeneği */}
            {currentStory?.userId === user?.uid ? (
              <>
                <TouchableOpacity 
                  style={styles.storyOptionItem}
                  onPress={handleDeleteStory}
                >
                  <Ionicons name="trash-outline" size={24} color="#ef4444" />
                  <Text style={[styles.storyOptionText, { color: '#ef4444' }]}>Hikayeyi Sil</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.storyOptionItem}
                  onPress={() => {
                    setShowStoryOptions(false);
                    // Görüntüleyenleri göster (gelecekte eklenecek)
                    Toast.show({
                      type: 'info',
                      text1: `${currentStory?.stories[currentStoryIndex]?.viewCount || 0} görüntülenme`,
                    });
                  }}
                >
                  <Ionicons name="eye-outline" size={24} color="#6366f1" />
                  <Text style={styles.storyOptionText}>Görüntüleyenler</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Başkasının hikayesi - Şikayet ve Engelle */}
                <TouchableOpacity 
                  style={styles.storyOptionItem}
                  onPress={handleReportStory}
                >
                  <Ionicons name="flag-outline" size={24} color="#f59e0b" />
                  <Text style={styles.storyOptionText}>Şikayet Et</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.storyOptionItem}
                  onPress={handleBlockUser}
                >
                  <Ionicons name="ban-outline" size={24} color="#ef4444" />
                  <Text style={[styles.storyOptionText, { color: '#ef4444' }]}>Kullanıcıyı Engelle</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity 
              style={[styles.storyOptionItem, styles.storyOptionCancel]}
              onPress={() => setShowStoryOptions(false)}
            >
              <Text style={styles.storyOptionCancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Story Creator Modal */}
      <Modal
        visible={showStoryCreator}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowStoryCreator(false);
          setSelectedStoryImage(null);
          setSelectedStoryVideo(null);
          setStoryCaption('');
        }}
      >
        <SafeAreaView style={styles.storyCreatorContainer}>
          <View style={styles.storyCreatorHeader}>
            <TouchableOpacity onPress={() => {
              setShowStoryCreator(false);
              setSelectedStoryImage(null);
              setSelectedStoryVideo(null);
              setStoryCaption('');
            }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.storyCreatorTitle}>Hikaye Oluştur</Text>
            <TouchableOpacity 
              onPress={handleCreateStory}
              disabled={uploadingStory || (!selectedStoryImage && !selectedStoryVideo)}
              style={[styles.storyShareBtn, (uploadingStory || (!selectedStoryImage && !selectedStoryVideo)) && { opacity: 0.5 }]}
            >
              <Text style={styles.storyShareText}>{uploadingStory ? 'Paylaşılıyor...' : 'Paylaş'}</Text>
            </TouchableOpacity>
          </View>

          {/* Fotoğraf Preview */}
          {selectedStoryImage && (
            <Image 
              source={{ uri: selectedStoryImage }} 
              style={styles.storyPreviewImage}
              resizeMode="contain"
            />
          )}

          {/* Video Preview */}
          {selectedStoryVideo && (
            <View style={styles.storyVideoPreview}>
              <Ionicons name="videocam" size={60} color="#6366f1" />
              <Text style={styles.storyVideoText}>Video seçildi</Text>
            </View>
          )}

          {/* Medya Değiştir Butonları */}
          <View style={styles.storyMediaButtons}>
            <TouchableOpacity 
              style={styles.storyMediaBtn}
              onPress={() => pickStoryMedia('photo')}
            >
              <Ionicons name="image" size={24} color="#10b981" />
              <Text style={styles.storyMediaBtnText}>Fotoğraf Değiştir</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.storyMediaBtn}
              onPress={() => pickStoryMedia('video')}
            >
              <Ionicons name="videocam" size={24} color="#6366f1" />
              <Text style={styles.storyMediaBtnText}>Video Değiştir</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.storyCaptionInput}>
            <TextInput
              style={styles.storyCaptionInputField}
              placeholder="Açıklama ekle..."
              placeholderTextColor="#9ca3af"
              value={storyCaption}
              onChangeText={setStoryCaption}
              maxLength={150}
              multiline
            />
          </View>

          <Text style={styles.storyNote}>⏰ Hikayeler 24 saat sonra otomatik olarak silinir</Text>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#6366f1' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 22, backgroundColor: '#1f2937' },
  
  // Stories
  storiesContainer: { borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingVertical: 12 },
  storiesScroll: { paddingHorizontal: 12 },
  storyItem: { alignItems: 'center', marginHorizontal: 6, width: 72 },
  storyCircle: { width: 68, height: 68, borderRadius: 34, padding: 3, justifyContent: 'center', alignItems: 'center' },
  addStoryCircle: { width: 68, height: 68, borderRadius: 34, padding: 3, justifyContent: 'center', alignItems: 'center' },
  addStoryInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
  storyImageContainer: { width: 60, height: 60, borderRadius: 30, overflow: 'hidden', backgroundColor: '#1f2937' },
  storyImage: { width: '100%', height: '100%' },
  storyPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1f2937' },
  storyName: { color: '#9ca3af', fontSize: 11, marginTop: 4, textAlign: 'center' },
  
  // Announcement Banner
  announcementBanner: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  announcementGradient: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  announcementIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  announcementContent: { flex: 1, marginLeft: 12 },
  announcementCommunity: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' },
  announcementText: { color: '#fff', fontSize: 14, marginTop: 2 },
  announcementClose: { padding: 4 },
  
  // Welcome Card
  welcomeCard: { marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  welcomeGradient: { padding: 16 },
  welcomeClose: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  welcomeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  welcomeEmoji: { fontSize: 36, marginRight: 12 },
  welcomeTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  welcomeSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 2 },
  progressContainer: { marginBottom: 16 },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 3 },
  progressText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 6, textAlign: 'right' },
  stepsContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepDone: { opacity: 0.7 },
  stepIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepIconDone: { backgroundColor: 'rgba(255,255,255,0.4)' },
  stepLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 11, textAlign: 'center' },
  stepLabelDone: { textDecorationLine: 'line-through' },
  
  // Quick Actions
  quickActionsContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  quickActionItem: { alignItems: 'center' },
  quickActionIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  quickActionLabel: { color: '#9ca3af', fontSize: 11 },
  
  // Quick Post
  quickPost: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', marginHorizontal: 16, marginVertical: 12, borderRadius: 12, padding: 14 },
  quickPostAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  quickPostText: { flex: 1, marginLeft: 12, color: '#6b7280', fontSize: 15 },
  quickPostActions: { flexDirection: 'row' },
  quickPostButton: { padding: 8 },
  
  // Posts
  postsList: { paddingBottom: 16 },
  postCard: { backgroundColor: '#111827', marginHorizontal: 16, marginTop: 12, borderRadius: 16, overflow: 'hidden' },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f2937', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  postHeaderInfo: { flex: 1, marginLeft: 12 },
  userName: { color: '#fff', fontSize: 15, fontWeight: '600' },
  postTime: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  moreButton: { padding: 8 },
  postContent: { paddingHorizontal: 14, paddingBottom: 14, color: '#e5e7eb', fontSize: 15, lineHeight: 22 },
  postImage: { width: '100%', height: 250 },
  postActions: { flexDirection: 'row', padding: 14, borderTopWidth: 1, borderTopColor: '#1f2937' },
  actionButton: { flexDirection: 'row', alignItems: 'center', marginRight: 24, gap: 6 },
  actionText: { color: '#6b7280', fontSize: 14 },
  likedText: { color: '#ef4444' },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32 },
  emptyIconContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#6b7280', fontSize: 14, marginTop: 8, textAlign: 'center' },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 20, gap: 8 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  
  // Skeleton styles
  skeletonCard: { backgroundColor: '#111827', marginHorizontal: 16, marginTop: 12, borderRadius: 16, padding: 14 },
  skeletonHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  skeletonAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1f2937' },
  skeletonHeaderInfo: { flex: 1, marginLeft: 12 },
  skeletonName: { width: 120, height: 14, borderRadius: 4, backgroundColor: '#1f2937' },
  skeletonTime: { width: 80, height: 10, borderRadius: 4, backgroundColor: '#1f2937', marginTop: 6 },
  skeletonContent: { width: '100%', height: 14, borderRadius: 4, backgroundColor: '#1f2937', marginBottom: 8 },
  skeletonContentShort: { width: '70%', height: 14, borderRadius: 4, backgroundColor: '#1f2937', marginBottom: 14 },
  skeletonActions: { width: '50%', height: 24, borderRadius: 4, backgroundColor: '#1f2937' },
  skeletonStories: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 12 },
  skeletonStoryItem: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#1f2937', marginHorizontal: 6 },

  // Story Viewer Styles
  storyViewerContainer: { flex: 1, backgroundColor: '#000' },
  storyProgressContainer: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 50, gap: 4 },
  storyProgressBarBg: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 1 },
  storyProgressBar: { height: '100%', backgroundColor: '#fff', borderRadius: 1 },
  storyViewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  storyUserInfo: { flexDirection: 'row', alignItems: 'center' },
  storyViewerAvatar: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },
  storyViewerName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  storyViewerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  storyViewerImage: { flex: 1, width: '100%' },
  storyCaption: { position: 'absolute', bottom: 140, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  storyCaptionText: { color: '#fff', fontSize: 16, textAlign: 'center' },
  storyTouchLeft: { position: 'absolute', left: 0, top: 100, bottom: 200, width: '30%' },
  storyTouchRight: { position: 'absolute', right: 0, top: 100, bottom: 200, width: '70%' },

  // Instagram Tarzı Story Bottom Actions
  storyBottomActions: { position: 'absolute', bottom: 40, left: 0, right: 0, padding: 16 },
  storyEmojiRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 16 },
  storyEmojiBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  storyEmoji: { fontSize: 22 },
  storyReplyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 25, paddingVertical: 12, paddingHorizontal: 20, gap: 8 },
  storyReplyButtonText: { color: '#fff', fontSize: 15 },
  
  // Story Reply Input
  storyReplyContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', padding: 12, paddingBottom: 30, gap: 12 },
  storyReplyInput: { flex: 1, backgroundColor: '#374151', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 15 },
  storyReplySendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(99,102,241,0.2)', justifyContent: 'center', alignItems: 'center' },

  // Story Options Modal
  storyOptionsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  storyOptionsContainer: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  storyOptionsHandle: { width: 40, height: 4, backgroundColor: '#4b5563', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  storyOptionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, gap: 16 },
  storyOptionText: { color: '#fff', fontSize: 16 },
  storyOptionCancel: { justifyContent: 'center', borderTopWidth: 1, borderTopColor: '#374151', marginTop: 8 },
  storyOptionCancelText: { color: '#9ca3af', fontSize: 16, textAlign: 'center' },

  // Story Creator Styles
  storyCreatorContainer: { flex: 1, backgroundColor: '#0a0a0a' },
  storyCreatorHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  storyCreatorTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  storyShareBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  storyShareText: { color: '#fff', fontWeight: '600' },
  storyPreviewImage: { flex: 1, width: '100%', backgroundColor: '#111' },
  storyVideoPreview: { flex: 1, width: '100%', backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
  storyVideoText: { color: '#9ca3af', fontSize: 16, marginTop: 12 },
  storyMediaButtons: { flexDirection: 'row', justifyContent: 'center', gap: 16, padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  storyMediaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, gap: 8 },
  storyMediaBtnText: { color: '#fff', fontSize: 14 },
  storyCaptionInput: { padding: 16, borderTopWidth: 1, borderTopColor: '#1f2937' },
  storyCaptionInputField: { color: '#fff', fontSize: 16, paddingVertical: 8, minHeight: 40 },
  storyNote: { color: '#9ca3af', fontSize: 12, textAlign: 'center', paddingBottom: 20 },
});
