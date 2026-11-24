// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  const { isLoading } = useAuth();

  // If still loading, show loading indicator
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

  // Don't check for isAuthenticated here - let login screen handle it
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login-username" />
        <Stack.Screen name="otp-verify" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
      </Stack>
    </>
  );
}