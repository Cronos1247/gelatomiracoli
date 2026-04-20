import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";

type QuickActionGridProps = {
  onEnterLab: () => void;
  onOpenPantry: () => void;
  onExportBook: () => void;
  onEditEquipment: () => void;
};

export function QuickActionGrid({
  onEnterLab,
  onOpenPantry,
  onExportBook,
  onEditEquipment,
}: QuickActionGridProps) {
  const { t } = useTranslation();
  const handlers = {
    lab: onEnterLab,
    pantry: onOpenPantry,
    export: onExportBook,
    settings: onEditEquipment,
  } as const;
  const actions = [
    { label: t("enterLab"), icon: "+", key: "lab" },
    { label: t("pantry"), icon: "[]", key: "pantry" },
    { label: t("exportBook"), icon: "^", key: "export" },
    { label: t("labSettings"), icon: "~", key: "settings" },
  ] as const;

  return (
    <View style={styles.grid}>
      {actions.map((action) => (
        <Pressable key={action.key} onPress={handlers[action.key]} style={styles.tile}>
          <Text style={styles.icon}>{action.icon}</Text>
          <Text style={styles.label}>{action.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tile: {
    width: "48%",
    minHeight: 96,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 14,
    justifyContent: "space-between",
  },
  icon: {
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: theme.typography.mono,
  },
  label: {
    color: theme.colors.muted,
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
});
