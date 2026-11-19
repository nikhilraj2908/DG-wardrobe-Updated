import AppBackground from "@/components/AppBackground";
import WardrobeHeader from "@/components/WardrobeHeader";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "@/app/theme/ThemeContext";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo } from "react";

const THEMES = [
  {
    id: "purple",
    label: "Purple Theme",
    subLabel: "Classic Light",
    icon: "sunny-outline",
    color: "#A855F7",
    accent: "#FAF5FF",
  },
  {
    id: "dark",
    label: "Dark Theme",
    subLabel: "Midnight Charcoal",
    icon: "moon-outline",
    color: "#161822",
    accent: "#A855F7",
  },
  {
    id: "blue",
    label: "Yellow Theme",
    subLabel: "Golden Amber",
    icon: "color-palette-outline",
    color: "#F59E0B",
    accent: "#FEFCE8",
  },
];

export default function ThemeSettings() {
  const { setThemeById, currentId, theme } = useTheme();
  const colors = theme.colors;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (id: string) => {
    setThemeById(id);
  };

  const handleBack = () => router.back();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AppBackground>
        <WardrobeHeader onBack={handleBack} />

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>Choose Theme</Text>
          <Text style={styles.subText}>
            Select the appearance of your DigiWardrobe app.
          </Text>

          {THEMES.map((themeOption) => {
            const active =
              currentId === themeOption.id ||
              (themeOption.id === "purple" && currentId === "light") ||
              (themeOption.id === "blue" && currentId === "yellow");

            return (
              <TouchableOpacity
                key={themeOption.id}
                style={[styles.option, active && styles.activeOption]}
                onPress={() => handleSelect(themeOption.id)}
                activeOpacity={0.8}
              >
                <View style={styles.row}>
                  {/* Theme Preview Dot */}
                  <View
                    style={[
                      styles.colorBadge,
                      {
                        backgroundColor: themeOption.color,
                        borderColor: themeOption.accent,
                      },
                    ]}
                  >
                    <Ionicons
                      name={themeOption.icon as any}
                      size={18}
                      color={themeOption.id === "dark" ? "#A855F7" : "#FFFFFF"}
                    />
                  </View>

                  <View style={styles.labelCol}>
                    <Text style={[styles.text, active && styles.activeText]}>
                      {themeOption.label}
                    </Text>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                      {themeOption.subLabel}
                    </Text>
                  </View>
                </View>

                {active && (
                  <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </AppBackground>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      padding: 20,
    },
    heading: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subText: {
      fontSize: 15,
      color: colors.textSecondary,
      marginBottom: 25,
    },
    option: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderRadius: 16,
      backgroundColor: colors.card,
      marginBottom: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    activeOption: {
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      shadowOpacity: 0.15,
      elevation: 4,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    colorBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 14,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    },
    labelCol: {
      flex: 1,
    },
    text: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 2,
    },
    subLabel: {
      fontSize: 13,
      fontWeight: "400",
    },
    activeText: {
      color: colors.primary,
      fontWeight: "700",
    },
  });
