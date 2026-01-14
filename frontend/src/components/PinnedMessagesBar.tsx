/**
 * Sabitlenmiş Mesajlar Barı
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PinnedMessage {
  id: string;
  content: string;
  senderName: string;
}

interface PinnedMessagesBarProps {
  messages: PinnedMessage[];
  currentIndex: number;
  onPress: () => void;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

export default function PinnedMessagesBar({
  messages,
  currentIndex,
  onPress,
  onNavigate,
  onClose,
}: PinnedMessagesBarProps) {
  if (!messages || messages.length === 0) return null;

  const currentMessage = messages[currentIndex] || messages[0];

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.pinIcon}>
        <Ionicons name="pin" size={18} color="#6366f1" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.content} onPress={onPress}>
        {messages.length > 1 && (
          <View style={styles.indicator}>
            {messages.map((_, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.dot, i === currentIndex && styles.dotActive]}
                onPress={() => onNavigate(i)}
              />
            ))}
          </View>
        )}
        <Text style={styles.senderName}>{currentMessage.senderName}</Text>
        <Text style={styles.messageText} numberOfLines={1}>
          {currentMessage.content}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Ionicons name="close" size={20} color="#6b7280" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  pinIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 10,
  },
  indicator: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#374151',
  },
  dotActive: {
    backgroundColor: '#6366f1',
    width: 12,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6366f1',
  },
  messageText: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
});
