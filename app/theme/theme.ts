// LIGHT THEME (DEFAULT - PURPLE)
export const theme = {
  colors: {
    primary: "#A855F7",
    primaryDark: "#7C3AED",
    middary: "#D8B4FE",

    background: "#FFFFFF",
    surface: "#FAF5FF",
    card: "#F8F2FF",

    addButton: "#A855F7",

    textPrimary: "#0F172A",
    textSecondary: "#64748B",
    textMuted: "#94A3B8",
    textDark: "#0F172A",
    textLight: "#FFFFFF",
    border: "#E9D5FF",
    lightborder: "#F3E8FF",
    danger: "#EF4444",
    success: "#22C55E",
    warning: "#F59E0B",

    overlay: "rgba(0, 0, 0, 0.35)",
  },
};

// 🌙 DARK THEME
export const darkTheme = {
  colors: {
    primary: "#A855F7",
    primaryDark: "#9333EA",
    middary: "#7E22CE",

    background: "#0B0C10",
    surface: "#161822",
    card: "#1E202C",

    addButton: "#A855F7",

    textPrimary: "#F8FAFC",
    textSecondary: "#94A3B8",
    textMuted: "#64748B",
    textDark: "#FFFFFF",
    textLight: "#FFFFFF",
    border: "#2A2D3D",
    lightborder: "#373B4E",
    danger: "#EF4444",
    success: "#22C55E",
    warning: "#F59E0B",

    overlay: "rgba(0, 0, 0, 0.7)",
  },
};

// 🟡 YELLOW THEME
export const blueTheme = {
  colors: {
    primary: "#F59E0B", // Warm rich gold / amber
    primaryDark: "#D97706", // Deep amber
    middary: "#FDE68A", // Soft pastel yellow for badges & opacity tints
    secondary: "#1A3C72", // Dark blue accent
    secondaryDark: "#0F1E3E",

    background: "#FCFCF7", // Warm ivory background
    surface: "#FFFFFF", // Clean surface
    card: "#FEFCE8", // Warm light gold tinted card

    addButton: "#F59E0B", // Matches yellow theme

    textPrimary: "#1F2937", // Crisp dark charcoal text
    textSecondary: "#78350F", // Warm deep amber-brown text
    textMuted: "#9CA3AF",
    textDark: "#111827",
    textLight: "#FFFFFF",

    border: "#FDE68A", // Golden border
    lightborder: "#FEF3C7", // Soft warm divider
    divider: "#E5E7EB",
    danger: "#EF4444",
    success: "#22C55E",
    warning: "#F59E0B",

    overlay: "rgba(0, 0, 0, 0.45)",
  },
};

export const lightTheme = theme;
export const yellowTheme = blueTheme;

export default function ThemeRoute() {
  return null;
}

