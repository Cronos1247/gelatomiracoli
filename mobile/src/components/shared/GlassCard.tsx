import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

type GlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  glowVariant?: "none" | "blue";
};

export function GlassCard({
  children,
  style,
  contentStyle,
  intensity = 36,
  glowVariant = "none",
}: GlassCardProps) {
  if (glowVariant === "blue") {
    return (
      <LinearGradient
        colors={["rgba(0, 198, 255, 0.6)", "rgba(0, 114, 255, 0.1)"]}
        style={[styles.blueGlowBorder, style]}
      >
        <BlurView intensity={intensity} tint="dark" style={styles.blueGlowCard}>
          <LinearGradient
            colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={[styles.content, contentStyle]}>{children}</View>
        </BlurView>
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.shell, style]}>
      <BlurView intensity={intensity} tint="dark" style={styles.card}>
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.02)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={[styles.content, contentStyle]}>{children}</View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 24,
    overflow: "hidden",
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "rgba(10, 10, 15, 0.48)",
  },
  blueGlowBorder: {
    padding: 2,
    borderRadius: 24,
  },
  blueGlowCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(10, 10, 15, 0.8)",
  },
  content: {
    borderRadius: 24,
  },
});
