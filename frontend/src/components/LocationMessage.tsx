/**
 * Konum Mesajı Görüntüleme Bileşeni
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationMessageProps {
  latitude: number;
  longitude: number;
  address?: string;
  isLive?: boolean;
  duration?: number;
  expiresAt?: Date;
}

export default function LocationMessage({
  latitude,
  longitude,
  address,
  isLive,
  duration,
  expiresAt,
}: LocationMessageProps) {
  const openInMaps = () => {
    const url = Platform.select({
      ios: `maps:${latitude},${longitude}?q=${address || 'Konum'}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}(${address || 'Konum'})`,
      default: `https://maps.google.com/?q=${latitude},${longitude}`,
    });

    Linking.openURL(url as string).catch(() => {
      // Google Maps web link ile aç
      Linking.openURL(`https://maps.google.com/?q=${latitude},${longitude}`);
    });
  };

  const isExpired = expiresAt && new Date() > new Date(expiresAt);

  return (
    <TouchableOpacity style={styles.container} onPress={openInMaps}>
      {/* Map Preview */}
      <View style={styles.mapPreview}>
        <Ionicons
          name={isLive ? 'navigate' : 'location'}
          size={32}
          color={isLive && !isExpired ? '#10b981' : '#6366f1'}
        />
        {isLive && !isExpired && (
          <View style={styles.liveBadge}>
            <View style={styles.liveIndicator} />
            <Text style={styles.liveText}>CANLI</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title}>
          {isLive ? (isExpired ? 'Canlı Konum (Sona Erdi)' : 'Canlı Konum') : 'Konum'}
        </Text>
        {address && <Text style={styles.address} numberOfLines={2}>{address}</Text>}
        <Text style={styles.coordinates}>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </Text>
        {isLive && duration && !isExpired && (
          <Text style={styles.duration}>
            {duration < 60 ? `${duration} dakika` : `${duration / 60} saat`} paylaşılıyor
          </Text>
        )}
      </View>

      {/* Open Button */}
      <View style={styles.openButton}>
        <Ionicons name="open-outline" size={20} color="#6366f1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    maxWidth: 280,
  },
  mapPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -4,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#fff',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  address: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  coordinates: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  duration: {
    fontSize: 11,
    color: '#10b981',
    marginTop: 4,
  },
  openButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
