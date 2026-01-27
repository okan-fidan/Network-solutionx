/**
 * Video Player Wrapper Component - expo-video ile
 */
import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

interface SimpleVideoPlayerProps {
  uri: string;
  style?: ViewStyle;
}

export default function SimpleVideoPlayer({ uri, style }: SimpleVideoPlayerProps) {
  const player = useVideoPlayer(uri, player => {
    player.loop = false;
  });

  // Web'de video desteklenmeyebilir
  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, style]}>
        <video 
          src={uri} 
          controls 
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <VideoView
        player={player}
        style={styles.video}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});
