import { Platform } from "react-native";

export const theme = {
  colors: {
    background: "#000000",
    surface: "#121212",
    surfaceAlt: "#1A1A1A",
    border: "#262626",
    accent: "#E5E5E5",
    text: "#FFFFFF",
    muted: "#707070",
    success: "#A5B4FC",
    warning: "#A5B4FC",
    danger: "#EF4444",
  },
  radius: {
    card: 4,
    pill: 999,
  },
  typography: {
    mono: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
    sans: Platform.select({
      ios: "System",
      android: "sans-serif",
      default: "System",
    }),
  },
  spacing: (value: number) => value * 4,
};
