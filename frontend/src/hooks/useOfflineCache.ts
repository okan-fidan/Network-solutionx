import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const CACHE_PREFIX = '@offline_cache:';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 saat

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export function useOfflineCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: {
    expiryMs?: number;
    enabled?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isCached, setIsCached] = useState(false);

  const cacheKey = `${CACHE_PREFIX}${key}`;
  const expiry = options?.expiryMs || CACHE_EXPIRY;

  // Önbellekten veri yükle
  const loadFromCache = useCallback(async (): Promise<T | null> => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp }: CacheItem<T> = JSON.parse(cached);
        const isExpired = Date.now() - timestamp > expiry;
        if (!isExpired) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
    return null;
  }, [cacheKey, expiry]);

  // Önbelleğe kaydet
  const saveToCache = useCallback(
    async (data: T) => {
      try {
        const cacheItem: CacheItem<T> = {
          data,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheItem));
      } catch (e) {
        console.warn('Cache write error:', e);
      }
    },
    [cacheKey]
  );

  // Veri çek
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Önce önbellekten dene
      const cachedData = await loadFromCache();
      if (cachedData) {
        setData(cachedData);
        setIsCached(true);
      }

      // Network kontrolü
      const netInfo = await NetInfo.fetch();
      setIsOffline(!netInfo.isConnected);

      if (netInfo.isConnected) {
        // Online: API'den veri çek
        const freshData = await fetchFn();
        setData(freshData);
        setIsCached(false);
        await saveToCache(freshData);
      } else if (!cachedData) {
        // Offline ve önbellekte veri yok
        throw new Error('Bağlantı yok ve önbellekte veri bulunamadı');
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, loadFromCache, saveToCache]);

  // İlk yükleme
  useEffect(() => {
    if (options?.enabled !== false) {
      fetchData();
    }
  }, [options?.enabled]);

  // Önbelleği temizle
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(cacheKey);
    } catch (e) {
      console.warn('Cache clear error:', e);
    }
  }, [cacheKey]);

  return {
    data,
    loading,
    error,
    isOffline,
    isCached,
    refetch: fetchData,
    clearCache,
  };
}

// Tüm önbelleği temizle
export async function clearAllCache() {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
    await AsyncStorage.multiRemove(cacheKeys);
  } catch (e) {
    console.warn('Clear all cache error:', e);
  }
}
