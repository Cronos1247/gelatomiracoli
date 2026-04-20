import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";

type LaunchPreset = {
  label: string;
  subtitle: string;
  archetypeKey:
    | "milk-based-standard"
    | "fruit-sorbet"
    | "low-sugar"
    | "clean-label"
    | "vegan"
    | "sugar-free";
  keyword: string;
  baseType: "dairy" | "water";
};

type ArchetypeCardsProps = {
  onLaunchPreset: (preset: LaunchPreset) => void;
};

const PRESETS: LaunchPreset[] = [
  {
    label: "MILK-BASE",
    subtitle: "Fior di Latte logic",
    archetypeKey: "milk-based-standard",
    keyword: "Fior di Latte",
    baseType: "dairy",
  },
  {
    label: "FRUIT SORBET",
    subtitle: "Lemon / water logic",
    archetypeKey: "fruit-sorbet",
    keyword: "Lemon",
    baseType: "water",
  },
  {
    label: "MODERN LOW-SUGAR",
    subtitle: "Modern reduced sweetness",
    archetypeKey: "low-sugar",
    keyword: "Modern Vanilla",
    baseType: "dairy",
  },
  {
    label: "FROM SCRATCH",
    subtitle: "Raw sugars and clean-label structure",
    archetypeKey: "clean-label",
    keyword: "Fresh Strawberry",
    baseType: "dairy",
  },
  {
    label: "VEGAN",
    subtitle: "Cocoa / water structure",
    archetypeKey: "vegan",
    keyword: "Chocolate",
    baseType: "water",
  },
  {
    label: "SUGAR-FREE",
    subtitle: "Polyols and fibers",
    archetypeKey: "sugar-free",
    keyword: "Chocolate",
    baseType: "dairy",
  },
];

export function ArchetypeCards({ onLaunchPreset }: ArchetypeCardsProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionLabel}>{t("archetypeLaunchpad")}</Text>
      {PRESETS.map((preset) => (
        <Pressable
          key={preset.label}
          style={styles.card}
          onPress={() => onLaunchPreset(preset)}
        >
          <View>
            <Text style={styles.title}>{preset.label}</Text>
            <Text style={styles.subtitle}>
              {preset.archetypeKey === "milk-based-standard"
                ? t("milkBasePreset")
                : preset.archetypeKey === "fruit-sorbet"
                  ? t("fruitSorbetPreset")
                  : preset.archetypeKey === "clean-label"
                    ? "Scratch-built artisan structure"
                  : preset.archetypeKey === "vegan"
                    ? "Vegan cocoa-water balance"
                    : preset.archetypeKey === "sugar-free"
                      ? "Sugar-free structure"
                      : t("modernLowSugarPreset")}
            </Text>
          </View>
          <Text style={styles.arrow}>{">"}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 10,
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#121212",
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 10,
    marginTop: 4,
    fontFamily: theme.typography.mono,
  },
  arrow: {
    color: theme.colors.text,
    fontSize: 18,
    fontFamily: theme.typography.mono,
  },
});
