import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LanguageToggle } from "../components/LanguageToggle";
import { useMobileLanguage } from "../i18n/LanguageProvider";
import { seedFoundationPantry } from "../lib/seedFoundation";
import { theme } from "../theme";

const PROFILE_COPY = {
  en: {
    title: "MAESTRO SETTINGS",
    settingsRows: ["My Account", "Equipment & Hardware", "App Preferences"],
    foundationReady: "Foundation Ready",
    foundationReadyInserted: (count: number) =>
      `Inserted ${count} foundation ingredients into Supabase.`,
    foundationReadyExisting: "Database already seeded.",
    foundationFailed: "Foundation Seed Failed",
    foundationFailedMessage: "Unable to initialize the foundation database.",
    adminLabel: "SYSTEM ADMIN",
    adminButton: "INITIALIZE FOUNDATION DATABASE",
  },
  es: {
    title: "AJUSTES DEL MAESTRO",
    settingsRows: ["Mi Cuenta", "Equipo y Hardware", "Preferencias de la App"],
    foundationReady: "Base Lista",
    foundationReadyInserted: (count: number) =>
      `Se insertaron ${count} ingredientes base en Supabase.`,
    foundationReadyExisting: "La base de datos ya fue inicializada.",
    foundationFailed: "Fallo la Inicializacion",
    foundationFailedMessage: "No se pudo inicializar la base de datos base.",
    adminLabel: "SISTEMA ADMIN",
    adminButton: "INICIALIZAR BASE FUNDAMENTAL",
  },
  it: {
    title: "IMPOSTAZIONI MAESTRO",
    settingsRows: ["Il Mio Account", "Attrezzatura e Hardware", "Preferenze App"],
    foundationReady: "Fondazione Pronta",
    foundationReadyInserted: (count: number) =>
      `Inseriti ${count} ingredienti base in Supabase.`,
    foundationReadyExisting: "Il database e gia stato inizializzato.",
    foundationFailed: "Inizializzazione Fallita",
    foundationFailedMessage: "Impossibile inizializzare il database base.",
    adminLabel: "SISTEMA ADMIN",
    adminButton: "INIZIALIZZA DATABASE BASE",
  },
} as const;

type ProfileScreenProps = {
  onOpenAccountSettings?: () => void;
  onOpenEquipmentSettings?: () => void;
  onOpenAppPreferences?: () => void;
};

export function ProfileScreen({
  onOpenAccountSettings,
  onOpenEquipmentSettings,
  onOpenAppPreferences,
}: ProfileScreenProps) {
  const { language } = useMobileLanguage();
  const copy = PROFILE_COPY[language];
  const rowActions = [
    onOpenAccountSettings,
    onOpenEquipmentSettings,
    onOpenAppPreferences,
  ];

  async function handleInitializeFoundationDatabase() {
    try {
      const result = await seedFoundationPantry();
      Alert.alert(
        copy.foundationReady,
        result.inserted > 0
          ? copy.foundationReadyInserted(result.inserted)
          : copy.foundationReadyExisting
      );
    } catch (error) {
      Alert.alert(
        copy.foundationFailed,
        error instanceof Error ? error.message : copy.foundationFailedMessage
      );
    }
  }

  return (
    <LinearGradient colors={["#0A0B14", "#000000"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{copy.title}</Text>
            <LanguageToggle />
          </View>

          <View style={styles.stack}>
            {copy.settingsRows.map((label, index) => (
              <Pressable
                key={label}
                style={styles.rowShell}
                onPress={rowActions[index]}
                disabled={!rowActions[index]}
              >
                <BlurView intensity={20} tint="dark" style={styles.rowBlur}>
                  <Text style={styles.rowLabel}>{label}</Text>
                </BlurView>
              </Pressable>
            ))}

            <View style={styles.rowShell}>
              <BlurView intensity={20} tint="dark" style={styles.adminCard}>
                <Text style={styles.adminLabel}>{copy.adminLabel}</Text>
                <Pressable
                  onPress={() => void handleInitializeFoundationDatabase()}
                  style={styles.adminButton}
                >
                  <Text style={styles.adminButtonText}>{copy.adminButton}</Text>
                </Pressable>
              </BlurView>
            </View>
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
    gap: 24,
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
  stack: {
    gap: 12,
  },
  rowShell: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    overflow: "hidden",
  },
  rowBlur: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "rgba(10, 10, 15, 0.4)",
  },
  rowLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: theme.typography.sans,
  },
  adminCard: {
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 18,
    backgroundColor: "rgba(10, 10, 15, 0.4)",
  },
  adminLabel: {
    color: "#A3A3A3",
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  adminButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  adminButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
});
