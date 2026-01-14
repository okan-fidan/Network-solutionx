import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import RatingPrompt from '../src/components/RatingPrompt';
import { useAppRating } from '../src/hooks/useAppRating';

const queryClient = new QueryClient();

function AppContent() {
  const {
    showPrompt,
    checkAndShowRating,
    handleRate,
    handleLater,
    handleDismiss,
  } = useAppRating();

  useEffect(() => {
    // Uygulama açıldığında rating kontrolü yap
    checkAndShowRating();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0a0a0a' },
          animation: 'slide_from_right',
        }}
      />
      <RatingPrompt
        visible={showPrompt}
        onRate={handleRate}
        onLater={handleLater}
        onDismiss={handleDismiss}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
