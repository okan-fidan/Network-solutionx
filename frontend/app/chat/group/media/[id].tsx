import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Modal,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SimpleVideoPlayer from '../../../../src/components/SimpleVideoPlayer';
import { subgroupApi } from '../../../../src/services/api';
import { showToast } from '../../../../src/components/ui';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 8) / 3;

type MediaType = 'media' | 'links' | 'docs';

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  timestamp: string;
  senderName: string;
}

interface LinkItem {
  id: string;
  url: string;
  title?: string;
  domain?: string;
  timestamp: string;
  senderName: string;
}

interface DocItem {
  id: string;
  name: string;
  url: string;
  size?: string;
  timestamp: string;
  senderName: string;
}

export default function GroupMediaScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<MediaType>('media');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const router = useRouter();

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      const [mediaRes, linksRes, docsRes] = await Promise.all([
        subgroupApi.getMedia(groupId).catch(() => ({ data: [] })),
        subgroupApi.getLinks(groupId).catch(() => ({ data: [] })),
        subgroupApi.getDocs(groupId).catch(() => ({ data: [] })),
      ]);
      setMediaItems(mediaRes.data || []);
      setLinks(linksRes.data || []);
      setDocs(docsRes.data || []);
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderMediaItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity
      style={styles.mediaItem}
      onPress={() => setSelectedMedia(item)}
      activeOpacity={0.8}
    >
      {item.type === 'image' ? (
        <Image source={{ uri: item.url }} style={styles.mediaImage} />
      ) : (
        <View style={styles.videoThumbnail}>
          <Image source={{ uri: item.url }} style={styles.mediaImage} />
          <View style={styles.playOverlay}>
            <Ionicons name="play-circle" size={40} color="#fff" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLinkItem = ({ item }: { item: LinkItem }) => (
    <TouchableOpacity
      style={styles.linkItem}
      onPress={() => Linking.openURL(item.url)}
    >
      <View style={styles.linkIconWrapper}>
        <Ionicons name="link" size={20} color="#6366f1" />
      </View>
      <View style={styles.linkInfo}>
        <Text style={styles.linkTitle} numberOfLines={1}>
          {item.title || item.url}
        </Text>
        <Text style={styles.linkDomain}>{item.domain || new URL(item.url).hostname}</Text>
        <Text style={styles.linkMeta}>{item.senderName} • {formatDate(item.timestamp)}</Text>
      </View>
      <Ionicons name="open-outline" size={18} color="#6b7280" />
    </TouchableOpacity>
  );

  const renderDocItem = ({ item }: { item: DocItem }) => {
    const getDocIcon = (name: string) => {
      const ext = name.split('.').pop()?.toLowerCase();
      switch (ext) {
        case 'pdf': return { icon: 'document-text', color: '#ef4444' };
        case 'doc':
        case 'docx': return { icon: 'document', color: '#3b82f6' };
        case 'xls':
        case 'xlsx': return { icon: 'grid', color: '#10b981' };
        case 'ppt':
        case 'pptx': return { icon: 'easel', color: '#f59e0b' };
        case 'zip':
        case 'rar': return { icon: 'archive', color: '#8b5cf6' };
        default: return { icon: 'document-attach', color: '#6b7280' };
      }
    };

    const docStyle = getDocIcon(item.name);

    return (
      <TouchableOpacity
        style={styles.docItem}
        onPress={() => Linking.openURL(item.url)}
      >
        <View style={[styles.docIconWrapper, { backgroundColor: `${docStyle.color}15` }]}>
          <Ionicons name={docStyle.icon as any} size={24} color={docStyle.color} />
        </View>
        <View style={styles.docInfo}>
          <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.docMeta}>
            {item.size && `${item.size} • `}{item.senderName} • {formatDate(item.timestamp)}
          </Text>
        </View>
        <TouchableOpacity style={styles.downloadButton}>
          <Ionicons name="download-outline" size={20} color="#6366f1" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (type: MediaType) => {
    const config = {
      media: { icon: 'images-outline', text: 'Henüz medya paylaşılmadı' },
      links: { icon: 'link-outline', text: 'Henüz link paylaşılmadı' },
      docs: { icon: 'document-outline', text: 'Henüz belge paylaşılmadı' },
    };

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrapper}>
          <Ionicons name={config[type].icon as any} size={48} color="#374151" />
        </View>
        <Text style={styles.emptyText}>{config[type].text}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medya, Linkler ve Belgeler</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'media' && styles.activeTab]}
          onPress={() => setActiveTab('media')}
        >
          <Ionicons
            name="images"
            size={20}
            color={activeTab === 'media' ? '#6366f1' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>
            Medya
          </Text>
          {mediaItems.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{mediaItems.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'links' && styles.activeTab]}
          onPress={() => setActiveTab('links')}
        >
          <Ionicons
            name="link"
            size={20}
            color={activeTab === 'links' ? '#6366f1' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'links' && styles.activeTabText]}>
            Linkler
          </Text>
          {links.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{links.length}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'docs' && styles.activeTab]}
          onPress={() => setActiveTab('docs')}
        >
          <Ionicons
            name="document"
            size={20}
            color={activeTab === 'docs' ? '#6366f1' : '#6b7280'}
          />
          <Text style={[styles.tabText, activeTab === 'docs' && styles.activeTabText]}>
            Belgeler
          </Text>
          {docs.length > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{docs.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'media' && (
        <FlatList
          data={mediaItems}
          keyExtractor={(item) => item.id}
          renderItem={renderMediaItem}
          numColumns={3}
          contentContainerStyle={styles.mediaGrid}
          ListEmptyComponent={renderEmptyState('media')}
        />
      )}

      {activeTab === 'links' && (
        <FlatList
          data={links}
          keyExtractor={(item) => item.id}
          renderItem={renderLinkItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState('links')}
        />
      )}

      {activeTab === 'docs' && (
        <FlatList
          data={docs}
          keyExtractor={(item) => item.id}
          renderItem={renderDocItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState('docs')}
        />
      )}

      {/* Media Viewer Modal */}
      <Modal visible={!!selectedMedia} animationType="fade" transparent>
        <View style={styles.mediaViewer}>
          <TouchableOpacity
            style={styles.closeViewer}
            onPress={() => setSelectedMedia(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedMedia?.type === 'image' ? (
            <Image
              source={{ uri: selectedMedia.url }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          ) : selectedMedia?.type === 'video' ? (
            <Video
              source={{ uri: selectedMedia.url }}
              style={styles.fullVideo}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
            />
          ) : null}
          <View style={styles.mediaViewerInfo}>
            <Text style={styles.mediaViewerName}>{selectedMedia?.senderName}</Text>
            <Text style={styles.mediaViewerDate}>
              {selectedMedia && formatDate(selectedMedia.timestamp)}
            </Text>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#6366f1',
  },
  tabBadge: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '600',
  },
  mediaGrid: {
    padding: 2,
  },
  mediaItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    padding: 2,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
  },
  videoThumbnail: {
    position: 'relative',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  linkIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  linkDomain: {
    fontSize: 13,
    color: '#6366f1',
    marginTop: 2,
  },
  linkMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  docIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  docMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  downloadButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  mediaViewer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewer: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '70%',
  },
  fullVideo: {
    width: '100%',
    height: '70%',
  },
  mediaViewerInfo: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  mediaViewerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  mediaViewerDate: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 4,
  },
});
