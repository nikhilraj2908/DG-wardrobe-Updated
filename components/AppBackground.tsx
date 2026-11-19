// components/AppBackground.tsx
import { useTheme } from "@/app/theme/ThemeContext";
import React, { ReactNode } from "react";
import { ImageBackground, StyleSheet, View } from "react-native";

type AppBackgroundProps = {
  children: ReactNode;
};

export default function AppBackground({ children }: AppBackgroundProps) {
  const { currentId, theme } = useTheme();
  const isDark = currentId === "dark";

  const bgSource = isDark
    ? require("../assets/images/bgallpage-dark.png")
    : require("../assets/images/bgallpage.png");

  return (
    <View style={[styles.base, { backgroundColor: theme.colors.background }]}>
      <ImageBackground
        source={bgSource}
        style={styles.background}
        resizeMode="cover"
      >
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: isDark
                ? "rgba(0, 0, 0, 0.35)"
                : "rgba(255, 255, 255, 0.05)",
            },
          ]}
        />
        {children}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
});
