import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useMobileLanguage } from "../i18n/LanguageProvider";
import type { MobileLanguage } from "../i18n";
import { theme } from "../theme";

const LANGUAGE_OPTIONS: Array<{ code: MobileLanguage; label: string }> = [
  { code: "en", label: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "es", label: "\uD83C\uDDEA\uD83C\uDDF8" },
  { code: "it", label: "\uD83C\uDDEE\uD83C\uDDF9" },
];

export function LanguageToggle() {
  const { language, setLanguage } = useMobileLanguage();

  return (
    <View style={styles.wrap}>
      <BlurView intensity={18} tint="dark" style={styles.pill}>
        {LANGUAGE_OPTIONS.map((option) => (
          <Pressable
            key={option.code}
            onPress={() => void setLanguage(option.code)}
            style={[styles.flagButton, language === option.code && styles.flagButtonActive]}
          >
            <Text style={styles.flagLabel}>{option.label}</Text>
          </Pressable>
        ))}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingRight: 4,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
    backgroundColor: "rgba(12, 16, 24, 0.22)",
  },
  flagButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  flagButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
  },
  flagLabel: {
    color: theme.colors.text,
    fontSize: 15,
  },
});
