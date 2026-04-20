import { Platform } from "react-native";

export const theme = {
  colors: {
    background: "#0A0B14",
    surface: "rgba(18, 18, 24, 0.82)",
    surfaceAlt: "rgba(24, 24, 30, 0.92)",
    border: "rgba(255, 255, 255, 0.1)",
    accent: "#00E5FF",
    text: "#FFFFFF",
    muted: "#8E93A3",
    success: "#00E676",
    warning: "#FFB866",
    danger: "#FF073A",
    cyanGlow: "#00E5FF",
    emeraldGlow: "#00E676",
    redGlow: "#FF073A",
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
