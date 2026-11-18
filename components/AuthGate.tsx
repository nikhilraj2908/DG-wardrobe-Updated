import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const {
    isAuthenticated,
    hydrated,
    profileCompleted,
    authInProgress,
  } = useAuth();

  useEffect(() => {
    if (!hydrated || authInProgress) return;

    const inAuthGroup = segments[0] === "(auth)";
    const screen = segments[1];

    const isCallback = inAuthGroup && screen === "callback";
    const isCompleteProfile = inAuthGroup && screen === "complete-profile";

    if (isCallback) return;

    // 1️⃣ Not authenticated: redirect to welcome if outside auth screens
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        router.replace("/(auth)/welcome");
      }
      return;
    }

    // 2️⃣ Logged in but profile incomplete: redirect to complete-profile
    if (profileCompleted === false) {
      if (!isCompleteProfile) {
        router.replace("/(auth)/complete-profile");
      }
      return;
    }

    // 3️⃣ Fully logged in: block auth screens, redirect to main app
    if (profileCompleted === true && inAuthGroup) {
      router.replace("/(tabs)/profile");
    }
  }, [isAuthenticated, hydrated, profileCompleted, authInProgress, segments]);

  // Wait for hydration before rendering anything
  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
