import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../contexts/AuthContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { useTheme } from '../contexts/ThemeContext';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

function RootLayoutInner() {
  const { isDark } = useTheme();
  return (
    <AuthProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="item/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="item/edit/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="workspace" options={{ headerShown: false }} />
        <Stack.Screen name="lending" options={{ headerShown: false }} />
        <Stack.Screen name="locations" options={{ headerShown: false }} />
        <Stack.Screen name="labels" options={{ headerShown: false }} />
        <Stack.Screen name="analytics" options={{ headerShown: false }} />
        <Stack.Screen name="collections" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RootLayoutInner />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
