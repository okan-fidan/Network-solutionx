/**
 * Konum Seçici ve Paylaşma Bileşeni
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  isLive?: boolean;
  duration?: number; // Live location için dakika
}

interface LocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (location: LocationData) => void;
}

export default function LocationPicker({
  visible,
  onClose,
  onSelectLocation,
}: LocationPickerProps) {
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState<string>('');
  const [showLiveOptions, setShowLiveOptions] = useState(false);

  useEffect(() => {
    if (visible) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum paylaşmak için konum izni gerekiyor.');
        onClose();
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentLocation(locationData);

      // Adres al
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (addressResult) {
          const addressParts = [
            addressResult.street,
            addressResult.district,
            addressResult.city,
          ].filter(Boolean);
          setAddress(addressParts.join(', '));
        }
      } catch (e) {
        console.error('Error getting address:', e);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('Hata', 'Konum alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleShareLocation = () => {
    if (currentLocation) {
      onSelectLocation({
        ...currentLocation,
        address,
        isLive: false,
      });
      onClose();
    }
  };

  const handleShareLiveLocation = (duration: number) => {
    if (currentLocation) {
      onSelectLocation({
        ...currentLocation,
        address,
        isLive: true,
        duration,
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Konum Paylaş</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.loadingText}>Konum alınıyor...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* Map Preview Placeholder */}
            <View style={styles.mapPreview}>
              <Ionicons name="location" size={64} color="#6366f1" />
              <Text style={styles.coordinatesText}>
                {currentLocation?.latitude.toFixed(6)}, {currentLocation?.longitude.toFixed(6)}
              </Text>
              {address && <Text style={styles.addressText}>{address}</Text>}
            </View>

            {/* Options */}
            <View style={styles.options}>
              {/* Current Location */}
              <TouchableOpacity style={styles.optionButton} onPress={handleShareLocation}>
                <View style={[styles.optionIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                  <Ionicons name="location" size={24} color="#6366f1" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Anlık Konum Gönder</Text>
                  <Text style={styles.optionSubtitle}>Mevcut konumunuzu paylaşın</Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#6b7280" />
              </TouchableOpacity>

              {/* Live Location */}
              <TouchableOpacity
                style={styles.optionButton}
                onPress={() => setShowLiveOptions(!showLiveOptions)}
              >
                <View style={[styles.optionIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                  <Ionicons name="navigate" size={24} color="#10b981" />
                </View>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionTitle}>Canlı Konum Paylaş</Text>
                  <Text style={styles.optionSubtitle}>Gerçek zamanlı konum takibi</Text>
                </View>
                <Ionicons
                  name={showLiveOptions ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>

              {/* Live Location Duration Options */}
              {showLiveOptions && (
                <View style={styles.liveOptions}>
                  {[15, 60, 480].map((mins) => (
                    <TouchableOpacity
                      key={mins}
                      style={styles.durationButton}
                      onPress={() => handleShareLiveLocation(mins)}
                    >
                      <Text style={styles.durationText}>
                        {mins < 60 ? `${mins} dakika` : `${mins / 60} saat`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
  },
  mapPreview: {
    height: height * 0.35,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderRadius: 16,
  },
  coordinatesText: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 12,
    fontFamily: 'monospace',
  },
  addressText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  options: {
    paddingHorizontal: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  optionSubtitle: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 2,
  },
  liveOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  durationButton: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  durationText: {
    color: '#fff',
    fontWeight: '600',
  },
});
