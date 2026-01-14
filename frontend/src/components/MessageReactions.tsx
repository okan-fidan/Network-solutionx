/**
 * Mesaj Tepkileri Bileşeni
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

interface Reaction {
  emoji: string;
  userId: string;
  userName: string;
}

interface MessageReactionsProps {
  reactions: Reaction[];
  onPress?: () => void;
}

export function MessageReactions({ reactions, onPress }: MessageReactionsProps) {
  if (!reactions || reactions.length === 0) return null;

  // Emoji'lere göre grupla
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = [];
    acc[r.emoji].push(r);
    return acc;
  }, {} as { [emoji: string]: Reaction[] });

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {Object.entries(grouped).map(([emoji, users]) => (
        <View key={emoji} style={styles.reactionBubble}>
          <Text style={styles.emoji}>{emoji}</Text>
          {users.length > 1 && <Text style={styles.count}>{users.length}</Text>}
        </View>
      ))}
    </TouchableOpacity>
  );
}

interface ReactionPickerProps {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { x: number; y: number };
}

export function ReactionPicker({ visible, onSelect, onClose }: ReactionPickerProps) {
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerContainer}>
          {REACTION_EMOJIS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.pickerEmoji}
              onPress={() => {
                onSelect(emoji);
                onClose();
              }}
            >
              <Text style={styles.pickerEmojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emoji: {
    fontSize: 14,
  },
  count: {
    fontSize: 11,
    color: '#9ca3af',
    marginLeft: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    borderRadius: 24,
    padding: 8,
    gap: 4,
  },
  pickerEmoji: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  pickerEmojiText: {
    fontSize: 24,
  },
});

export { REACTION_EMOJIS };
