/**
 * Sesli Mesaj Kaydedici Bileşeni - expo-audio ile
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingOptions, AudioModule } from 'expo-audio';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel: () => void;
}

const recordingOptions: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 2,
  bitRate: 128000,
};

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const audioRecorder = useAudioRecorder(recordingOptions);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    requestPermission();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const requestPermission = async () => {
    try {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      setPermissionGranted(status.granted);
      if (!status.granted) {
        Alert.alert('İzin Gerekli', 'Sesli mesaj göndermek için mikrofon izni gerekiyor.');
      }
    } catch (error) {
      console.error('Permission error:', error);
    }
  };

  const startRecording = async () => {
    if (!permissionGranted) {
      await requestPermission();
      return;
    }

    try {
      await audioRecorder.record();
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Recording error:', error);
      Alert.alert('Hata', 'Ses kaydı başlatılamadı');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;

    try {
      if (timerRef.current) clearInterval(timerRef.current);
      
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      
      setIsRecording(false);

      if (uri && duration > 0) {
        onRecordingComplete(uri, duration);
      }
    } catch (error) {
      console.error('Stop recording error:', error);
    }
  };

  const cancelRecording = async () => {
    if (isRecording) {
      try {
        if (timerRef.current) clearInterval(timerRef.current);
        await audioRecorder.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    setDuration(0);
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelButton} onPress={cancelRecording}>
        <Ionicons name="close" size={24} color="#ef4444" />
      </TouchableOpacity>

      {/* Recording Indicator */}
      <View style={styles.recordingInfo}>
        <Animated.View
          style={[
            styles.recordingDot,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <Text style={styles.durationText}>{formatDuration(duration)}</Text>
        <Text style={styles.recordingLabel}>
          {isRecording ? 'Kayıt yapılıyor...' : 'Kayda başlamak için basılı tutun'}
        </Text>
      </View>

      {/* Record Button */}
      <TouchableOpacity
        style={[styles.recordButton, isRecording && styles.recordButtonActive]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        delayLongPress={0}
      >
        <Ionicons
          name={isRecording ? 'stop' : 'mic'}
          size={28}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  cancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 8,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ef4444',
  },
  durationText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  recordingLabel: {
    color: '#6b7280',
    fontSize: 13,
    flex: 1,
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#ef4444',
  },
});
