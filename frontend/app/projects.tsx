/**
 * Projeler Sayfası
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../src/contexts/AuthContext';
import api from '../src/services/api';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  assigneeId?: string;
  assigneeName?: string;
  dueDate?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in_progress' | 'completed';
  ownerId: string;
  ownerName: string;
  members: { userId: string; userName: string; role: 'owner' | 'member' }[];
  tasks: Task[];
  createdAt: string;
  progress: number;
}

export default function ProjectsScreen() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProjectDetail, setShowProjectDetail] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ title: '', description: '' });
  const [newTask, setNewTask] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'my' | 'member'>('all');

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const response = await api.get('/api/projects');
      setProjects(response.data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.title.trim()) {
      Alert.alert('Hata', 'Proje adı gerekli');
      return;
    }

    try {
      await api.post('/api/projects', {
        title: newProject.title.trim(),
        description: newProject.description.trim(),
      });

      Alert.alert('Başarılı', 'Proje oluşturuldu!');
      setShowCreateModal(false);
      setNewProject({ title: '', description: '' });
      loadProjects();
    } catch (error: any) {
      Alert.alert('Hata', error?.response?.data?.detail || 'Proje oluşturulamadı');
    }
  };

  const handleAddTask = async (projectId: string) => {
    if (!newTask.trim()) return;

    try {
      await api.post(`/api/projects/${projectId}/tasks`, {
        title: newTask.trim(),
      });

      setNewTask('');
      loadProjects();
    } catch (error) {
      Alert.alert('Hata', 'Görev eklenemedi');
    }
  };

  const handleUpdateTaskStatus = async (projectId: string, taskId: string, status: Task['status']) => {
    try {
      await api.put(`/api/projects/${projectId}/tasks/${taskId}`, { status });
      loadProjects();
    } catch (error) {
      Alert.alert('Hata', 'Görev güncellenemedi');
    }
  };

  const handleInviteMember = async (projectId: string) => {
    Alert.prompt(
      'Üye Davet Et',
      'Davet etmek istediğiniz kişinin e-posta adresini girin',
      async (email) => {
        if (email) {
          try {
            await api.post(`/api/projects/${projectId}/invite`, { email });
            Alert.alert('Başarılı', 'Davet gönderildi');
            loadProjects();
          } catch (error) {
            Alert.alert('Hata', 'Davet gönderilemedi');
          }
        }
      },
      'plain-text'
    );
  };

  const statusColors: any = {
    planning: '#f59e0b',
    in_progress: '#3b82f6',
    completed: '#10b981',
  };

  const statusLabels: any = {
    planning: 'Planlama',
    in_progress: 'Devam Ediyor',
    completed: 'Tamamlandı',
  };

  const taskStatusColors: any = {
    todo: '#6b7280',
    in_progress: '#3b82f6',
    done: '#10b981',
  };

  const filteredProjects = projects.filter((p) => {
    if (activeFilter === 'my') return p.ownerId === user?.uid;
    if (activeFilter === 'member') return p.members.some((m) => m.userId === user?.uid);
    return true;
  });

  const renderProjectCard = (project: Project) => (
    <TouchableOpacity
      key={project.id}
      style={styles.projectCard}
      onPress={() => setShowProjectDetail(project)}
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectTitleRow}>
          <View style={[styles.projectIcon, { backgroundColor: statusColors[project.status] + '20' }]}>
            <Ionicons name="folder" size={24} color={statusColors[project.status]} />
          </View>
          <View style={styles.projectTitleInfo}>
            <Text style={styles.projectTitle}>{project.title}</Text>
            <Text style={styles.projectOwner}>{project.ownerName}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColors[project.status] + '20' }]}>
          <Text style={[styles.statusText, { color: statusColors[project.status] }]}>
            {statusLabels[project.status]}
          </Text>
        </View>
      </View>

      {project.description && (
        <Text style={styles.projectDescription} numberOfLines={2}>
          {project.description}
        </Text>
      )}

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${project.progress}%` }]} />
        </View>
        <Text style={styles.progressText}>{project.progress}%</Text>
      </View>

      {/* Stats */}
      <View style={styles.projectStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={16} color="#6b7280" />
          <Text style={styles.statText}>{project.members.length} üye</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="checkbox" size={16} color="#6b7280" />
          <Text style={styles.statText}>
            {project.tasks.filter((t) => t.status === 'done').length}/{project.tasks.length} görev
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Projeler</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)} style={styles.addButton}>
          <Ionicons name="add" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'my', 'member'] as const).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
              {filter === 'all' ? 'Tümü' : filter === 'my' ? 'Benim' : 'Üye Olduğum'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Projects List */}
      <ScrollView style={styles.content}>
        {filteredProjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={64} color="#374151" />
            <Text style={styles.emptyText}>Henüz proje yok</Text>
            <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Proje Oluştur</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredProjects.map(renderProjectCard)
        )}
      </ScrollView>

      {/* Create Project Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Yeni Proje</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Proje Adı"
              placeholderTextColor="#6b7280"
              value={newProject.title}
              onChangeText={(text) => setNewProject({ ...newProject, title: text })}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Açıklama (opsiyonel)"
              placeholderTextColor="#6b7280"
              value={newProject.description}
              onChangeText={(text) => setNewProject({ ...newProject, description: text })}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateProject}>
              <Text style={styles.submitButtonText}>Oluştur</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Project Detail Modal */}
      <Modal visible={!!showProjectDetail} animationType="slide">
        <SafeAreaView style={styles.container}>
          {showProjectDetail && (
            <>
              <View style={styles.header}>
                <TouchableOpacity onPress={() => setShowProjectDetail(null)} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{showProjectDetail.title}</Text>
                <TouchableOpacity onPress={() => handleInviteMember(showProjectDetail.id)} style={styles.addButton}>
                  <Ionicons name="person-add" size={22} color="#6366f1" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.content}>
                {/* Project Info */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Proje Bilgileri</Text>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailDescription}>{showProjectDetail.description || 'Açıklama yok'}</Text>
                    <View style={styles.detailRow}>
                      <Ionicons name="calendar" size={16} color="#6b7280" />
                      <Text style={styles.detailText}>
                        {format(new Date(showProjectDetail.createdAt), 'd MMMM yyyy', { locale: tr })}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Members */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Üyeler ({showProjectDetail.members.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {showProjectDetail.members.map((member) => (
                      <View key={member.userId} style={styles.memberCard}>
                        <View style={styles.memberAvatar}>
                          <Text style={styles.memberAvatarText}>
                            {member.userName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.memberName}>{member.userName}</Text>
                        <Text style={styles.memberRole}>
                          {member.role === 'owner' ? 'Sahip' : 'Üye'}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>

                {/* Tasks */}
                <View style={styles.detailSection}>
                  <Text style={styles.sectionTitle}>Görevler ({showProjectDetail.tasks.length})</Text>
                  
                  {/* Add Task */}
                  <View style={styles.addTaskRow}>
                    <TextInput
                      style={styles.addTaskInput}
                      placeholder="Yeni görev ekle..."
                      placeholderTextColor="#6b7280"
                      value={newTask}
                      onChangeText={setNewTask}
                    />
                    <TouchableOpacity
                      style={styles.addTaskButton}
                      onPress={() => handleAddTask(showProjectDetail.id)}
                    >
                      <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {/* Task List */}
                  {showProjectDetail.tasks.map((task) => (
                    <View key={task.id} style={styles.taskCard}>
                      <TouchableOpacity
                        style={[
                          styles.taskCheckbox,
                          task.status === 'done' && styles.taskCheckboxDone,
                        ]}
                        onPress={() =>
                          handleUpdateTaskStatus(
                            showProjectDetail.id,
                            task.id,
                            task.status === 'done' ? 'todo' : 'done'
                          )
                        }
                      >
                        {task.status === 'done' && (
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <View style={styles.taskInfo}>
                        <Text
                          style={[
                            styles.taskTitle,
                            task.status === 'done' && styles.taskTitleDone,
                          ]}
                        >
                          {task.title}
                        </Text>
                        {task.assigneeName && (
                          <Text style={styles.taskAssignee}>{task.assigneeName}</Text>
                        )}
                      </View>
                      <View style={[styles.taskStatusDot, { backgroundColor: taskStatusColors[task.status] }]} />
                    </View>
                  ))}
                </View>
              </ScrollView>
            </>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff', flex: 1, textAlign: 'center' },
  addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  filters: { flexDirection: 'row', padding: 16, gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937' },
  filterButtonActive: { backgroundColor: '#6366f1' },
  filterText: { color: '#9ca3af', fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 64, gap: 16 },
  emptyText: { color: '#6b7280', fontSize: 16 },
  createButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, gap: 8 },
  createButtonText: { color: '#fff', fontWeight: '600' },
  projectCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  projectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  projectTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  projectIcon: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  projectTitleInfo: { flex: 1 },
  projectTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  projectOwner: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  projectDescription: { color: '#9ca3af', fontSize: 14, marginBottom: 16, lineHeight: 20 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  progressBar: { flex: 1, height: 6, backgroundColor: '#1f2937', borderRadius: 3 },
  progressFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 3 },
  progressText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  projectStats: { flexDirection: 'row', gap: 20 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statText: { color: '#6b7280', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: '600' },
  input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16, marginBottom: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#6366f1', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  detailSection: { marginBottom: 24 },
  sectionTitle: { color: '#9ca3af', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: 12 },
  detailCard: { backgroundColor: '#111827', borderRadius: 12, padding: 16 },
  detailDescription: { color: '#e5e7eb', fontSize: 15, marginBottom: 12, lineHeight: 22 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { color: '#6b7280', fontSize: 14 },
  memberCard: { alignItems: 'center', marginRight: 16, padding: 12, backgroundColor: '#111827', borderRadius: 12 },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  memberAvatarText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  memberName: { color: '#fff', fontSize: 13, fontWeight: '500' },
  memberRole: { color: '#6b7280', fontSize: 11, marginTop: 2 },
  addTaskRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  addTaskInput: { flex: 1, backgroundColor: '#1f2937', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 15 },
  addTaskButton: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#6366f1', justifyContent: 'center', alignItems: 'center' },
  taskCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8, gap: 12 },
  taskCheckbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#374151', justifyContent: 'center', alignItems: 'center' },
  taskCheckboxDone: { backgroundColor: '#10b981', borderColor: '#10b981' },
  taskInfo: { flex: 1 },
  taskTitle: { color: '#fff', fontSize: 15 },
  taskTitleDone: { textDecorationLine: 'line-through', color: '#6b7280' },
  taskAssignee: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  taskStatusDot: { width: 8, height: 8, borderRadius: 4 },
});
