import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
};

// Hazır Skeleton Bileşenleri
export const SkeletonCard: React.FC = () => (
  <View style={styles.card}>
    <Skeleton width={56} height={56} borderRadius={16} />
    <View style={styles.cardContent}>
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={14} style={{ marginTop: 8 }} />
    </View>
  </View>
);

export const SkeletonMessage: React.FC<{ isOwn?: boolean }> = ({ isOwn }) => (
  <View style={[styles.message, isOwn && styles.messageOwn]}>
    {!isOwn && <Skeleton width={32} height={32} borderRadius={16} />}
    <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
      <Skeleton width={isOwn ? 120 : 180} height={14} />
      <Skeleton width={isOwn ? 80 : 120} height={14} style={{ marginTop: 6 }} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </View>
);

export const SkeletonChat: React.FC = () => (
  <View style={styles.chat}>
    <SkeletonMessage />
    <SkeletonMessage isOwn />
    <SkeletonMessage />
    <SkeletonMessage />
    <SkeletonMessage isOwn />
  </View>
);

export const SkeletonProfile: React.FC = () => (
  <View style={styles.profile}>
    <Skeleton width={100} height={100} borderRadius={50} />
    <Skeleton width={150} height={20} style={{ marginTop: 16 }} />
    <Skeleton width={100} height={14} style={{ marginTop: 8 }} />
    <View style={styles.profileStats}>
      <Skeleton width={60} height={40} borderRadius={12} />
      <Skeleton width={60} height={40} borderRadius={12} />
      <Skeleton width={60} height={40} borderRadius={12} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#374151',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 16,
    marginBottom: 12,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    gap: 8,
  },
  messageOwn: {
    flexDirection: 'row-reverse',
  },
  messageBubble: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  messageBubbleOwn: {
    backgroundColor: '#374151',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  list: {
    padding: 16,
  },
  chat: {
    padding: 16,
  },
  profile: {
    alignItems: 'center',
    padding: 24,
  },
  profileStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
});
