import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme, darkTheme, blueTheme } from "./theme";

type ThemeType = typeof theme;

const THEME_MAP: Record<string, ThemeType> = {
  light: theme,
  purple: theme,   // default purple theme
  dark: darkTheme, // dark theme
  blue: blueTheme, // yellow / gold theme (historical id: blue)
  yellow: blueTheme,
};

interface ThemeContextValue {
  theme: ThemeType;
  setThemeById: (id: string) => Promise<void>;
  currentId: string;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: theme,
  setThemeById: async () => {},
  currentId: "purple",
  isDarkMode: false,
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeState, setThemeState] = useState(theme);
  const [currentId, setCurrentId] = useState("purple");

  // 🔹 Load saved theme on app start
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem("APP_THEME");
      if (saved && THEME_MAP[saved]) {
        setThemeState(THEME_MAP[saved]);
        setCurrentId(saved);
      }
    } catch (e) {
      console.log("Failed to load theme from storage", e);
    }
  };

  // 🔹 Change theme + persist it
  const setThemeById = async (id: string) => {
    const selected = THEME_MAP[id];
    if (!selected) return;

    setThemeState(selected);
    setCurrentId(id);
    await AsyncStorage.setItem("APP_THEME", id).catch(() => {});
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: themeState,
        setThemeById,
        currentId,
        isDarkMode: currentId === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

export default function ThemeContextRoute() {
  return null;
}

