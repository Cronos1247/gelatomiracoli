import { ScrollView, StyleSheet } from "react-native";
import { DashboardHeader } from "../components/DashboardHeader";
import { QuickActionGrid } from "../components/QuickActionGrid";
import { ArchetypeCards } from "../components/ArchetypeCards";

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

type DashboardScreenProps = {
  activeEquipmentLabel: string;
  activeDisplayLabel: string;
  recipeCount: number;
  onEnterLab: () => void;
  onOpenPantry: () => void;
  onExportBook: () => void;
  onEditEquipment: () => void;
  onLaunchPreset: (preset: LaunchPreset) => void;
};

export function DashboardScreen({
  activeEquipmentLabel,
  activeDisplayLabel,
  recipeCount,
  onEnterLab,
  onOpenPantry,
  onExportBook,
  onEditEquipment,
  onLaunchPreset,
}: DashboardScreenProps) {
  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <DashboardHeader
        activeEquipmentLabel={activeEquipmentLabel}
        activeDisplayLabel={activeDisplayLabel}
        recipeCount={recipeCount}
        onPressLibrary={onExportBook}
      />
      <QuickActionGrid
        onEnterLab={onEnterLab}
        onOpenPantry={onOpenPantry}
        onExportBook={onExportBook}
        onEditEquipment={onEditEquipment}
      />
      <ArchetypeCards onLaunchPreset={onLaunchPreset} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 18,
  },
});
