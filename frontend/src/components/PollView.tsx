/**
 * Anket Görüntüleme Bileşeni
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // userId array
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  anonymous: boolean;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
}

interface PollViewProps {
  poll: Poll;
  currentUserId: string;
  onVote: (optionIds: string[]) => void;
}

export default function PollView({ poll, currentUserId, onVote }: PollViewProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
  const hasVoted = poll.options.some((opt) => opt.votes.includes(currentUserId));

  const handleOptionPress = (optionId: string) => {
    if (hasVoted) return;

    if (poll.allowMultiple) {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((id) => id !== optionId)
          : [...prev, optionId]
      );
    } else {
      setSelectedOptions([optionId]);
    }
  };

  const handleVote = () => {
    if (selectedOptions.length > 0) {
      onVote(selectedOptions);
    }
  };

  const getPercentage = (votes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <View style={styles.container}>
      {/* Question */}
      <View style={styles.questionContainer}>
        <Ionicons name="bar-chart" size={20} color="#6366f1" />
        <Text style={styles.question}>{poll.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {poll.options.map((option) => {
          const percentage = getPercentage(option.votes.length);
          const isSelected = selectedOptions.includes(option.id);
          const userVoted = option.votes.includes(currentUserId);

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.option,
                isSelected && styles.optionSelected,
                userVoted && styles.optionVoted,
              ]}
              onPress={() => handleOptionPress(option.id)}
              disabled={hasVoted}
            >
              {/* Progress Bar */}
              {hasVoted && (
                <View style={[styles.progressBar, { width: `${percentage}%` }]} />
              )}

              <View style={styles.optionContent}>
                <View style={styles.optionLeft}>
                  {!hasVoted && (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                    </View>
                  )}
                  <Text style={[styles.optionText, userVoted && styles.optionTextVoted]}>
                    {option.text}
                  </Text>
                </View>

                {hasVoted && (
                  <View style={styles.optionRight}>
                    <Text style={styles.percentageText}>{percentage}%</Text>
                    {!poll.anonymous && (
                      <Text style={styles.voteCount}>{option.votes.length}</Text>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })})
      </View>

      {/* Vote Button */}
      {!hasVoted && selectedOptions.length > 0 && (
        <TouchableOpacity style={styles.voteButton} onPress={handleVote}>
          <Text style={styles.voteButtonText}>Oy Ver</Text>
        </TouchableOpacity>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {totalVotes} oy
          {poll.anonymous && ' • Anonim'}
          {poll.allowMultiple && ' • Çoklu seçim'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    maxWidth: 300,
  },
  questionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  question: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 22,
  },
  options: {
    gap: 8,
  },
  option: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  optionSelected: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  optionVoted: {},
  progressBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    color: '#e5e7eb',
  },
  optionTextVoted: {
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  voteCount: {
    fontSize: 12,
    color: '#6b7280',
  },
  voteButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    alignItems: 'center',
  },
  voteButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    marginTop: 12,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
