import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LanguageToggle } from "../components/LanguageToggle";
import { useMobileLanguage } from "../i18n/LanguageProvider";
import { theme } from "../theme";

const LIBRARY_COPY = {
  en: {
    title: "RECIPE VAULT",
    searchPlaceholder: "Search recipes...",
    placeholder: "Your finalized recipes will appear here.",
  },
  es: {
    title: "BOVEDA DE RECETAS",
    searchPlaceholder: "Buscar recetas...",
    placeholder: "Tus recetas finalizadas apareceran aqui.",
  },
  it: {
    title: "ARCHIVIO RICETTE",
    searchPlaceholder: "Cerca ricette...",
    placeholder: "Le tue ricette finalizzate appariranno qui.",
  },
} as const;

export function LibraryScreen() {
  const { language } = useMobileLanguage();
  const copy = LIBRARY_COPY[language];

  return (
    <LinearGradient colors={["#0A0B14", "#000000"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{copy.title}</Text>
            <LanguageToggle />
          </View>

          <View style={styles.searchShell}>
            <BlurView intensity={20} tint="dark" style={styles.searchBlur}>
              <MaterialCommunityIcons name="magnify" size={18} color="#707070" />
              <TextInput
                placeholder={copy.searchPlaceholder}
                placeholderTextColor="#707070"
                editable={false}
                style={styles.searchInput}
              />
            </BlurView>
          </View>

          <View style={styles.placeholderCard}>
            <BlurView intensity={20} tint="dark" style={styles.placeholderBlur}>
              <Text style={styles.placeholderText}>{copy.placeholder}</Text>
            </BlurView>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
  },
  searchShell: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  searchBlur: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(12, 16, 24, 0.22)",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.sans,
    paddingVertical: 0,
  },
  placeholderCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    overflow: "hidden",
  },
  placeholderBlur: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "rgba(10, 10, 15, 0.4)",
  },
  placeholderText: {
    color: "#A3A3A3",
    fontSize: 14,
    lineHeight: 20,
    fontFamily: theme.typography.sans,
  },
});
