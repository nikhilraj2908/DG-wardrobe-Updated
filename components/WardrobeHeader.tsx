import { useTheme } from "@/app/theme/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  onBack: () => void;
  onSearch?: () => void;
  onNotification?: () => void;
  showFilters?: boolean;
  activeSort?: "worth" | "alpha" | "views";
  onSort?: (type: "worth" | "alpha" | "views") => void;
}

export default function WardrobeHeader({
  onBack,
  onSearch,
  onNotification,
  showFilters = false,
  activeSort,
  onSort,
}: Props) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  // Move FilterBtn inside to access styles
  const FilterBtn = ({
    label,
    icon,
    active,
    onPress,
  }: {
    label: string;
    icon: any;
    active?: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.filterBtn, active && styles.filterActive]}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? "#FFFFFF" : colors.textPrimary}
      />
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.left}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.logoText}>
            <Text style={styles.logoHighlight}>D</Text>
            <Text style={styles.logoHighlight1}>W</Text>
          </Text>
        </View>
      </View>

      {showFilters && onSort && (
        <View style={styles.filtersRow}>
          <FilterBtn
            label="Worth"
            icon="cash-outline"
            active={activeSort === "worth"}
            onPress={() => onSort("worth")}
          />
          <FilterBtn
            label="A–Z"
            icon="text-outline"
            active={activeSort === "alpha"}
            onPress={() => onSort("alpha")}
          />
          <FilterBtn
            label="Views"
            icon="eye-outline"
            active={activeSort === "views"}
            onPress={() => onSort("views")}
          />
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: 16,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    left: {
      flexDirection: "row",
      alignItems: "center",
    },
    backBtn: {
      marginRight: 10,
    },
    logoText: {
      fontSize: 22,
    },
    logoHighlight: {
      color: colors.primary,
      fontFamily: "Cookie",
      fontSize: 35,
    },
    logoHighlight1: {
      fontFamily: "Cookie",
      fontSize: 35,
      color: colors.textPrimary,
    },
    filtersRow: {
      flexDirection: "row",
      marginTop: 14,
      gap: 10,
    },
    filterBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    filterActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterText: {
      fontSize: 13,
      color: colors.textPrimary,
      fontWeight: "600",
    },
    filterTextActive: {
      color: "#FFFFFF",
      fontWeight: "700",
    },
  });