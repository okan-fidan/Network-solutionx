/**
 * Anket Oluşturma Bileşeni
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PollOption {
  id: string;
  text: string;
}

interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  expiresAt?: Date;
}

interface PollCreatorProps {
  visible: boolean;
  onClose: () => void;
  onCreatePoll: (poll: PollData) => void;
}

export default function PollCreator({ visible, onClose, onCreatePoll }: PollCreatorProps) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [anonymous, setAnonymous] = useState(false);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, { id: Date.now().toString(), text: '' }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((o) => o.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const handleCreate = () => {
    if (!question.trim()) {
      Alert.alert('Hata', 'Lütfen bir soru girin');
      return;
    }

    const validOptions = options.filter((o) => o.text.trim());
    if (validOptions.length < 2) {
      Alert.alert('Hata', 'En az 2 seçenek gerekli');
      return;
    }

    onCreatePoll({
      question: question.trim(),
      options: validOptions,
      allowMultiple,
      anonymous,
    });

    // Reset
    setQuestion('');
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' },
    ]);
    setAllowMultiple(false);
    setAnonymous(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Anket Oluştur</Text>
          <TouchableOpacity onPress={handleCreate}>
            <Text style={styles.createText}>Oluştur</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Question */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Soru</Text>
            <TextInput
              style={styles.questionInput}
              placeholder="Sorunuzu yazın..."
              placeholderTextColor="#6b7280"
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={200}
            />
          </View>

          {/* Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seçenekler</Text>
            {options.map((option, index) => (
              <View key={option.id} style={styles.optionRow}>
                <View style={styles.optionNumber}>
                  <Text style={styles.optionNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  style={styles.optionInput}
                  placeholder={`Seçenek ${index + 1}`}
                  placeholderTextColor="#6b7280"
                  value={option.text}
                  onChangeText={(text) => updateOption(option.id, text)}
                  maxLength={100}
                />
                {options.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeOption(option.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {options.length < 10 && (
              <TouchableOpacity style={styles.addButton} onPress={addOption}>
                <Ionicons name="add-circle" size={24} color="#6366f1" />
                <Text style={styles.addButtonText}>Seçenek Ekle</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ayarlar</Text>
            
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="checkbox" size={24} color="#6366f1" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Çoklu Seçim</Text>
                  <Text style={styles.settingSubtitle}>Birden fazla seçenek seçilebilir</Text>
                </View>
              </View>
              <Switch
                value={allowMultiple}
                onValueChange={setAllowMultiple}
                trackColor={{ false: '#374151', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Ionicons name="eye-off" size={24} color="#6366f1" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Anonim Oylama</Text>
                  <Text style={styles.settingSubtitle}>Oylar gizli tutulur</Text>
                </View>
              </View>
              <Switch
                value={anonymous}
                onValueChange={setAnonymous}
                trackColor={{ false: '#374151', true: '#6366f1' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  createText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  questionInput: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionNumberText: {
    color: '#9ca3af',
    fontWeight: '600',
  },
  optionInput: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 15,
  },
  removeButton: {
    marginLeft: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#6366f1',
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
  },
  settingTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
});
