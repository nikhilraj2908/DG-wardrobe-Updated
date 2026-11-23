import { useAuth } from "@/context/AuthContext";
import { useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const segments = useSegments();
  const router = useRouter();
  const hasHiddenSplash = useRef(false);

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
    } else if (profileCompleted === false) {
      // 2️⃣ Logged in but profile incomplete: redirect to complete-profile
      if (!isCompleteProfile) {
        router.replace("/(auth)/complete-profile");
      }
    } else if (profileCompleted === true && inAuthGroup) {
      // 3️⃣ Fully logged in: block auth screens, redirect to main app
      router.replace("/(tabs)/profile");
    }

    // Smoothly dismiss splash screen once auth resolution and initial route are set
    if (!hasHiddenSplash.current) {
      hasHiddenSplash.current = true;
      setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 150);
    }
  }, [isAuthenticated, hydrated, profileCompleted, authInProgress, segments]);

  // Safety fallback: if hydration takes > 3.5 seconds, hide splash screen so user is never blocked
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasHiddenSplash.current) {
        hasHiddenSplash.current = true;
        SplashScreen.hideAsync().catch(() => {});
      }
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  // While auth is hydrating, keep screen blank (under native splash screen) without showing spinners
  if (!hydrated) {
    return null;
  }

  return <>{children}</>;
}
