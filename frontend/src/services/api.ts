import axios from 'axios';
import { auth } from '../config/firebase';
import Constants from 'expo-constants';

// Get backend URL from environment
const getBaseUrl = () => {
  // For Expo Go and development builds
  const backendUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL 
    || process.env.EXPO_PUBLIC_BACKEND_URL 
    || '';
  return backendUrl;
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 saniye timeout
});

// Add auth token to requests
api.interceptors.request.use(async (config) => {
  try {
    const user = auth.currentUser;
    console.log('API Request - User:', user?.email || 'No user', 'URL:', config.url);
    if (user) {
      const token = await user.getIdToken(true); // Force refresh token
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Token added to request');
    } else {
      console.warn('No authenticated user for API request:', config.url);
    }
  } catch (error) {
    console.error('Error getting auth token:', error);
  }
  return config;
});

export const postApi = {
  getAll: () => api.get('/api/posts'),
  getOne: (id: string) => api.get(`/api/posts/${id}`),
  create: (data: any) => api.post('/api/posts', data),
  like: (id: string) => api.post(`/api/posts/${id}/like`),
  delete: (id: string) => api.delete(`/api/posts/${id}`),
  getComments: (id: string) => api.get(`/api/posts/${id}/comments`),
  addComment: (id: string, data: any) => api.post(`/api/posts/${id}/comments`, data),
  share: (id: string) => api.post(`/api/posts/${id}/share`),
  // Post Pinning - Sadece Admin
  pin: (id: string) => api.post(`/api/posts/${id}/pin`),
  unpin: (id: string) => api.delete(`/api/posts/${id}/pin`),
  getPinned: () => api.get('/api/posts/pinned'),
};

// Story API - Kullanıcı hikayeleri (24 saat sonra otomatik silinir)
export const storyApi = {
  getAll: () => api.get('/api/stories'),
  getUserStories: (userId: string) => api.get(`/api/stories/${userId}`),
  create: (data: { imageUrl?: string; videoUrl?: string; caption?: string }) => api.post('/api/stories', data),
  view: (storyId: string) => api.post(`/api/stories/${storyId}/view`),
  delete: (storyId: string) => api.delete(`/api/stories/${storyId}`),
  // Instagram özellikleri
  react: (storyId: string, emoji: string) => api.post(`/api/stories/${storyId}/react`, { emoji }),
  reply: (storyId: string, message: string) => api.post(`/api/stories/${storyId}/reply`, { message }),
  report: (storyId: string, reason: string) => api.post(`/api/stories/${storyId}/report`, { reason }),
  getReactions: (storyId: string) => api.get(`/api/stories/${storyId}/reactions`),
  getViewers: (storyId: string) => api.get(`/api/stories/${storyId}/viewers`),
};

export const communityApi = {
  getAll: () => api.get('/api/communities'),
  getOne: (id: string) => api.get(`/api/communities/${id}`),
  join: (id: string) => api.post(`/api/communities/${id}/join`),
  leave: (id: string) => api.post(`/api/communities/${id}/leave`),
  getAnnouncements: (id: string) => api.get(`/api/communities/${id}/announcements`),
  createAnnouncement: (id: string, data: any) => api.post(`/api/communities/${id}/announcements`, data),
  deleteAnnouncement: (communityId: string, announcementId: string) => api.delete(`/api/communities/${communityId}/announcements/${announcementId}`),
  getSubgroups: (id: string) => api.get(`/api/communities/${id}/subgroups`),
  sendAnnouncement: (id: string, data: any) => api.post(`/api/communities/${id}/announcements`, data),
};

export const subgroupApi = {
  getOne: (id: string) => api.get(`/api/subgroups/${id}`),
  join: (id: string) => api.post(`/api/subgroups/${id}/join`),
  requestJoin: (id: string) => api.post(`/api/subgroups/${id}/request-join`),
  leave: (id: string) => api.post(`/api/subgroups/${id}/leave`),
  getMessages: (id: string) => api.get(`/api/subgroups/${id}/messages`),
  sendMessage: (id: string, data: any) => api.post(`/api/subgroups/${id}/messages`, data),
  markAsRead: (id: string) => api.put(`/api/subgroups/${id}/read`),
  getPendingRequests: (id: string) => api.get(`/api/subgroups/${id}/pending-requests`),
  approveRequest: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/approve/${userId}`),
  rejectRequest: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/reject/${userId}`),
  // Yeni eklenen fonksiyonlar
  getMembers: (id: string) => api.get(`/api/subgroups/${id}/members`),
  deleteMessage: (subgroupId: string, messageId: string, deleteForAll: boolean = false) => 
    api.delete(`/api/subgroups/${subgroupId}/messages/${messageId}?delete_for_all=${deleteForAll}`),
  editMessage: (subgroupId: string, messageId: string, data: any) => 
    api.put(`/api/subgroups/${subgroupId}/messages/${messageId}`, data),
  reactToMessage: (subgroupId: string, messageId: string, emoji: string) =>
    api.post(`/api/subgroups/${subgroupId}/messages/${messageId}/react`, { emoji }),
  pinMessage: (subgroupId: string, messageId: string) => api.post(`/api/subgroups/${subgroupId}/messages/${messageId}/pin`),
  getPinnedMessages: (id: string) => api.get(`/api/subgroups/${id}/pinned-messages`),
  getPolls: (id: string) => api.get(`/api/subgroups/${id}/polls`),
  createPoll: (id: string, data: any) => api.post(`/api/subgroups/${id}/polls`, data),
  votePoll: (subgroupId: string, pollId: string, optionIndex: number) => api.post(`/api/subgroups/${subgroupId}/polls/${pollId}/vote`, { optionIndex }),
  deletePoll: (subgroupId: string, pollId: string) => api.delete(`/api/subgroups/${subgroupId}/polls/${pollId}`),
  muteMember: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/mute/${userId}`),
  kickMember: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/kick/${userId}`),
  // Medya ve belgeler
  getMedia: (id: string) => api.get(`/api/subgroups/${id}/media`),
  getLinks: (id: string) => api.get(`/api/subgroups/${id}/links`),
  getDocs: (id: string) => api.get(`/api/subgroups/${id}/docs`),
  
  // Alt Yönetici (Moderatör) Sistemi
  getMyRole: (id: string) => api.get(`/api/subgroups/${id}/my-role`),
  getModerators: (id: string) => api.get(`/api/subgroups/${id}/moderators`),
  addModerator: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/moderators/${userId}`),
  removeModerator: (subgroupId: string, userId: string) => api.delete(`/api/subgroups/${subgroupId}/moderators/${userId}`),
  // Alt yönetici işlemleri
  modDeleteMessage: (subgroupId: string, messageId: string) => api.post(`/api/subgroups/${subgroupId}/mod/delete-message/${messageId}`),
  modBanUser: (subgroupId: string, userId: string, reason: string) => api.post(`/api/subgroups/${subgroupId}/mod/ban/${userId}`, { reason }),
  modKickUser: (subgroupId: string, userId: string, reason: string, notes?: string) => 
    api.post(`/api/subgroups/${subgroupId}/mod/kick/${userId}`, { reason, notes }),
  getKickReports: (id: string) => api.get(`/api/subgroups/${id}/kick-reports`),
  getModLogs: (id: string) => api.get(`/api/subgroups/${id}/mod-logs`),
  
  // Üye yönetimi
  removeMember: (subgroupId: string, userId: string) => api.delete(`/api/subgroups/${subgroupId}/members/${userId}`),
  // Açıklama güncelle
  updateDescription: (id: string, description: string) => api.put(`/api/subgroups/${id}/description`, { description }),
};

export const subgroupRequestApi = {
  request: (subgroupId: string) => api.post(`/api/subgroups/${subgroupId}/request-join`),
  requestJoin: (subgroupId: string) => api.post(`/api/subgroups/${subgroupId}/request-join`),
  approve: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/approve/${userId}`),
  reject: (subgroupId: string, userId: string) => api.post(`/api/subgroups/${subgroupId}/reject/${userId}`),
};

export const serviceApi = {
  getAll: (communityId?: string) => api.get(`/api/services${communityId ? `?community_id=${communityId}` : ''}`),
  getOne: (id: string) => api.get(`/api/services/${id}`),
  create: (data: any) => api.post('/api/services', data),
  update: (id: string, data: any) => api.put(`/api/services/${id}`, data),
  delete: (id: string) => api.delete(`/api/services/${id}`),
  getReviews: (id: string) => api.get(`/api/services/${id}/reviews`),
  addReview: (id: string, data: any) => api.post(`/api/services/${id}/reviews`, data),
};

export const userApi = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (data: any) => api.put('/api/user/profile', data),
  updateLocation: (data: any) => api.put('/api/user/location', data),
  getPrivacySettings: () => api.get('/api/user/privacy-settings'),
  updatePrivacySettings: (data: any) => api.put('/api/user/privacy-settings', data),
  savePushToken: (token: string) => api.post('/api/user/push-token', { token }),
  register: (data: any) => api.post('/api/user/register', data),
};

export const userListApi = {
  getAll: () => api.get('/api/users'),
  getOne: (uid: string) => api.get(`/api/users/${uid}`),
  search: (query: string) => api.get(`/api/users/search?q=${query}`),
};

export const notificationApi = {
  getAll: () => api.get('/api/notifications'),
  markAsRead: (id: string) => api.put(`/api/notifications/${id}/read`),
  markAllAsRead: () => api.put('/api/notifications/read-all'),
  send: (data: any) => api.post('/api/notifications/send', data),
  savePushToken: (token: string) => api.post('/api/users/push-token', { token }),
  getNotifications: (skip?: number, limit?: number) => 
    api.get(`/api/notifications?skip=${skip || 0}&limit=${limit || 50}`),
};

export const badgeApi = {
  getMyBadges: () => api.get('/api/badges/my-badges'),
  getDefinitions: () => api.get('/api/badges/definitions'),
  getLeaderboard: () => api.get('/api/badges/leaderboard'),
};

export const eventApi = {
  getAll: (params?: string) => api.get(`/api/events${params || ''}`),
  getOne: (id: string) => api.get(`/api/events/${id}`),
  create: (data: any) => api.post('/api/events', data),
  attend: (id: string) => api.post(`/api/events/${id}/attend`),
  unattend: (id: string) => api.post(`/api/events/${id}/unattend`),
};

export const generalApi = {
  getCities: () => api.get('/api/cities'),
};

export const adminApi = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  getUsers: () => api.get('/api/admin/users'),
  getCommunities: () => api.get('/api/admin/communities'),
  getAllJoinRequests: () => api.get('/api/admin/join-requests'),
  createCommunity: (data: any) => api.post('/api/admin/communities', data),
  updateCommunity: (id: string, data: any) => api.put(`/api/admin/communities/${id}`, data),
  deleteCommunity: (id: string) => api.delete(`/api/admin/communities/${id}`),
  getCommunityMembers: (communityId: string) => api.get(`/api/admin/communities/${communityId}/members`),
  banFromCommunity: (communityId: string, userId: string) => api.post(`/api/admin/communities/${communityId}/ban/${userId}`),
  kickFromCommunity: (communityId: string, userId: string) => api.post(`/api/admin/communities/${communityId}/kick/${userId}`),
  addSuperAdmin: (communityId: string, userId: string) => api.post(`/api/admin/communities/${communityId}/super-admin/${userId}`),
  removeSuperAdmin: (communityId: string, userId: string) => api.delete(`/api/admin/communities/${communityId}/super-admin/${userId}`),
  getCommunitySubgroups: (communityId: string) => api.get(`/api/admin/communities/${communityId}/subgroups`),
  updateSubgroup: (subgroupId: string, data: any) => api.put(`/api/admin/subgroups/${subgroupId}`, data),
  deleteSubgroup: (subgroupId: string) => api.delete(`/api/admin/subgroups/${subgroupId}`),
  banUser: (userId: string) => api.post(`/api/admin/users/${userId}/ban`),
  unbanUser: (userId: string) => api.post(`/api/admin/users/${userId}/unban`),
  restrictUser: (userId: string, hours: number) => api.post(`/api/admin/users/${userId}/restrict`, { hours }),
  unrestrictUser: (userId: string) => api.post(`/api/admin/users/${userId}/unrestrict`),
  makeAdmin: (userId: string) => api.post(`/api/admin/users/${userId}/make-admin`),
  removeAdmin: (userId: string) => api.post(`/api/admin/users/${userId}/remove-admin`),
};

// Conversation (DM) API
export const conversationApi = {
  getAll: (type?: string) => api.get(`/api/conversations${type ? `?type=${type}` : ''}`),
  getOne: (id: string) => api.get(`/api/conversations/${id}`),
  start: (data: { otherUserId: string; type?: string; serviceId?: string }) => 
    api.post('/api/conversations/start', data),
  delete: (id: string) => api.delete(`/api/conversations/${id}`),
  getMessages: (conversationId: string) => api.get(`/api/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: { content: string; type?: string; mediaUrl?: string }) => 
    api.post(`/api/conversations/${conversationId}/messages`, data),
  // Okundu olarak işaretle
  markAsRead: (conversationId: string) => api.put(`/api/conversations/${conversationId}/read`),
  // WhatsApp benzeri özellikler
  deleteMessage: (conversationId: string, messageId: string, deleteForAll: boolean = false) =>
    api.delete(`/api/conversations/${conversationId}/messages/${messageId}?delete_for_all=${deleteForAll}`),
  reactToMessage: (conversationId: string, messageId: string, emoji: string) =>
    api.post(`/api/conversations/${conversationId}/messages/${messageId}/react`, { emoji }),
  replyToMessage: (conversationId: string, messageId: string, data: { content: string; type?: string }) =>
    api.post(`/api/conversations/${conversationId}/messages/${messageId}/reply`, data),
  editMessage: (conversationId: string, messageId: string, content: string) =>
    api.put(`/api/conversations/${conversationId}/messages/${messageId}`, { content }),
  // Medya ve konum
  sendLocation: (conversationId: string, data: { latitude: number; longitude: number; address?: string }) =>
    api.post(`/api/conversations/${conversationId}/location`, data),
  uploadMedia: (conversationId: string, formData: FormData) =>
    api.post(`/api/conversations/${conversationId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// Kullanıcı etkileşimleri API
export const userInteractionApi = {
  // Engelleme
  blockUser: (userId: string) => api.post(`/api/users/${userId}/block`),
  unblockUser: (userId: string) => api.delete(`/api/users/${userId}/block`),
  getBlockedUsers: () => api.get('/api/users/blocked'),
  // Şikayet
  reportUser: (userId: string, data: { reason: string; description?: string }) =>
    api.post(`/api/users/${userId}/report`, data),
  // Sessize alma
  muteUser: (userId: string, duration: string) => api.post(`/api/users/${userId}/mute`, { duration }),
  unmuteUser: (userId: string) => api.delete(`/api/users/${userId}/mute`),
  // Durum
  getUserStatus: (userId: string) => api.get(`/api/users/${userId}/status`),
};

// Membership API - Üyelik Sistemi
export const membershipApi = {
  // Üyelik durumu
  getStatus: () => api.get('/api/membership/status'),
  // Üyelik planları
  getPlans: () => api.get('/api/membership/plans'),
  // Satın alma başlat
  purchase: (planId: string) => api.post('/api/membership/purchase', { planId }),
  // Test modunda onay
  confirmTest: (orderId: string) => api.post(`/api/membership/confirm-test/${orderId}`),
  // Sipariş geçmişi
  getOrders: () => api.get('/api/membership/orders'),
};

export default api;
