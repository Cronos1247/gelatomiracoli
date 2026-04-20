import type { ReactNode } from "react";
import { SafeAreaView, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type GlassWrapperProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function GlassWrapper({ children, style, contentStyle }: GlassWrapperProps) {
  return (
    <LinearGradient colors={["#0A0B14", "#000000"]} style={[styles.gradient, style]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.content, contentStyle]}>{children}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
  },
});
