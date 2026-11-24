import { Slot } from "expo-router";
import * as Font from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SavedItemsProvider } from "../context/SavedItemsContext";
import { FollowProvider } from "@/context/FollowContext";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "./theme/ThemeContext";
import AuthGate from "@/components/AuthGate";
import { StatusBar } from "expo-status-bar";

function GlobalStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar style={isDarkMode ? "light" : "dark"} />;
}

// Prevent splash screen from auto-hiding until initial fonts & auth are ready
SplashScreen.preventAutoHideAsync().catch(() => {});

/* ---------------- ROOT ---------------- */
export default function RootLayout() {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          Cookie: require("../assets/fonts/Cookie-Regular.ttf"),
        });
      } catch (e) {
        console.warn("Font loading error:", e);
      } finally {
        setFontsLoaded(true);
      }
    }

    prepare();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <FollowProvider>
          <SavedItemsProvider>
            <ThemeProvider>
              <GlobalStatusBar />
              <AuthGate>
                <Slot />
              </AuthGate>
            </ThemeProvider>
          </SavedItemsProvider>
        </FollowProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
