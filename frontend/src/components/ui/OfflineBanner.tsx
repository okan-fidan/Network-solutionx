import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const slideAnim = useState(new Animated.Value(-60))[0];

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      
      if (offline !== isOffline) {
        if (offline) {
          setWasOffline(true);
        }
        setIsOffline(offline);
        
        Animated.spring(slideAnim, {
          toValue: offline || (wasOffline && !offline) ? 0 : -60,
          useNativeDriver: true,
          friction: 8,
        }).start();

        // Bağlantı geri geldiğinde banner'ı 3 saniye sonra kapat
        if (!offline && wasOffline) {
          setTimeout(() => {
            Animated.timing(slideAnim, {
              toValue: -60,
              duration: 300,
              useNativeDriver: true,
            }).start(() => setWasOffline(false));
          }, 3000);
        }
      }
    });

    return () => unsubscribe();
  }, [isOffline, wasOffline]);

  const showBanner = isOffline || wasOffline;

  if (!showBanner) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        isOffline ? styles.offline : styles.online,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <Ionicons
        name={isOffline ? 'cloud-offline' : 'cloud-done'}
        size={18}
        color="#fff"
      />
      <Text style={styles.text}>
        {isOffline ? 'İnternet bağlantısı yok' : 'Bağlantı sağlandı'}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
    zIndex: 9999,
  },
  offline: {
    backgroundColor: '#ef4444',
  },
  online: {
    backgroundColor: '#10b981',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
