import { Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";

type DashboardHeaderProps = {
  activeEquipmentLabel: string;
  activeDisplayLabel: string;
  recipeCount: number;
  onPressLibrary: () => void;
};

export function DashboardHeader({
  activeEquipmentLabel,
  activeDisplayLabel,
  recipeCount,
  onPressLibrary,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  return (
    <BlurView intensity={18} tint="dark" style={styles.pill}>
      <View style={styles.block}>
        <Text style={styles.label}>🍦 {t("dashboardLab")}</Text>
        <Text style={styles.value}>{activeEquipmentLabel.toUpperCase()}</Text>
      </View>
      <View style={styles.block}>
        <Text style={styles.label}>❄️ {t("dashboardCase")}</Text>
        <Text style={styles.value}>{activeDisplayLabel.toUpperCase()}</Text>
      </View>
      <Pressable style={styles.block} onPress={onPressLibrary}>
        <Text style={styles.label}>📚 {t("dashboardLibrary")}</Text>
        <Text style={styles.value}>{recipeCount}</Text>
      </Pressable>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  block: {
    flex: 1,
    gap: 4,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  value: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.typography.mono,
  },
});
