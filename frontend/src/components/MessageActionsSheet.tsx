/**
 * Mesaj İşlemleri Bottom Sheet
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { REACTION_EMOJIS } from './MessageReactions';

const { height } = Dimensions.get('window');

interface MessageActionsSheetProps {
  visible: boolean;
  onClose: () => void;
  isMyMessage: boolean;
  isPinned: boolean;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onReact: (emoji: string) => void;
}

export default function MessageActionsSheet({
  visible,
  onClose,
  isMyMessage,
  isPinned,
  onReply,
  onForward,
  onPin,
  onCopy,
  onDelete,
  onEdit,
  onReact,
}: MessageActionsSheetProps) {
  const actions = [
    { icon: 'arrow-undo', label: 'Yanıtla', onPress: onReply },
    { icon: 'arrow-redo', label: 'İlet', onPress: onForward },
    { icon: isPinned ? 'pin-outline' : 'pin', label: isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle', onPress: onPin },
    { icon: 'copy', label: 'Kopyala', onPress: onCopy },
  ];

  if (isMyMessage && onEdit) {
    actions.push({ icon: 'pencil', label: 'Düzenle', onPress: onEdit });
  }

  if (isMyMessage) {
    actions.push({ icon: 'trash', label: 'Sil', onPress: onDelete, danger: true } as any);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.sheet}>
          {/* Quick Reactions */}
          <View style={styles.reactionsRow}>
            {REACTION_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionButton}
                onPress={() => {
                  onReact(emoji);
                  onClose();
                }}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Actions */}
          {actions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionButton}
              onPress={() => {
                action.onPress();
                onClose();
              }}
            >
              <View style={[styles.actionIcon, (action as any).danger && styles.dangerIcon]}>
                <Ionicons
                  name={action.icon as any}
                  size={22}
                  color={(action as any).danger ? '#ef4444' : '#6366f1'}
                />
              </View>
              <Text style={[styles.actionLabel, (action as any).danger && styles.dangerLabel]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>İptal</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 34,
    maxHeight: height * 0.6,
  },
  reactionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  reactionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reactionEmoji: {
    fontSize: 24,
  },
  divider: {
    height: 1,
    backgroundColor: '#1f2937',
    marginVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dangerIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  actionLabel: {
    color: '#fff',
    fontSize: 16,
  },
  dangerLabel: {
    color: '#ef4444',
  },
  cancelButton: {
    marginTop: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
});
