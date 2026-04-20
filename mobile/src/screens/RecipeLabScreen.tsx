import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MaestroSlider } from "../components/MaestroSlider";
import { PhysicsHud } from "../components/PhysicsHud";
import { RecipeTable } from "../components/RecipeTable";
import { GlassCard } from "../components/shared";
import { useMobileLanguage } from "../i18n/LanguageProvider";
import { loadEquipmentSettings, type DisplayCaseRecord, type EquipmentUnitRecord } from "../lib/equipmentSettings";
import { generateProductionPDF } from "../lib/generateProductionPDF";
import { printRecipe } from "../lib/printRecipe";
import { saveRecipeToLibrary } from "../lib/saveRecipeToLibrary";
import {
  useRecipeLab,
  type BaseType,
  type LabIngredient,
} from "../lab/useRecipeLab";
import { theme } from "../theme";
import type { MobileIngredient } from "../types";

export type RecipeLabPreset = {
  token: number;
  keyword: string;
  archetypeKey:
    | "milk-based-standard"
    | "high-fat"
    | "fruit-sorbet"
    | "low-sugar"
    | "clean-label"
    | "vegan"
    | "sugar-free";
  baseType: BaseType;
};

export type MobileAssistBridge = {
  hint?: string | null;
  message?: string | null;
  onSubmit: (command: string) => Promise<void>;
  onUndo?: () => Promise<void>;
  onDismiss?: () => void;
};

type RecipeLabScreenProps = {
  ingredients: MobileIngredient[];
  preset?: RecipeLabPreset | null;
  onAssistBridgeChange?: (bridge: MobileAssistBridge | null) => void;
  onQuickAddIngredient?: (ingredient: MobileIngredient) => void;
  onRecipeSaved?: () => Promise<void> | void;
};

const ARCHETYPE_OPTIONS = [
  { key: "milk-based-standard", label: "Classic Crema" },
  { key: "high-fat", label: "Rich Chocolate/Nut" },
  { key: "fruit-sorbet", label: "Fresh Fruit Sorbet" },
  { key: "low-sugar", label: "Custom Lab" },
  { key: "clean-label", label: "From Scratch" },
  { key: "vegan", label: "Vegan Structure" },
  { key: "sugar-free", label: "Sugar-Free" },
] as const;

const FRUIT_MATCH = /strawberry|fragola|mango|lemon|limone|fruit|sorbet/i;

function AnimatedLabReadout({
  value,
  variant = "primary",
}: {
  value: string;
  variant?: "primary" | "secondary";
}) {
  const glow = useSharedValue(0.45);

  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glow]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: variant === "primary" ? 0.84 + glow.value * 0.16 : 0.72 + glow.value * 0.12,
    transform: [{ scale: 0.994 + glow.value * 0.016 }],
  }));

  return (
    <Reanimated.Text
      style={[
        variant === "primary" ? styles.batchValueText : styles.predictedYieldText,
        animatedStyle,
      ]}
    >
      {value}
    </Reanimated.Text>
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isWaterOnlyIngredient(ingredient: LabIngredient) {
  const name = normalize(ingredient.name);
  const category = normalize(ingredient.category ?? "");

  return (
    ingredient.role === "water" ||
    /water only/.test(category) ||
    (/fruit/.test(name) && /stabilizer|base/.test(category))
  );
}

function isDairyOnlyIngredient(ingredient: LabIngredient) {
  const name = normalize(ingredient.name);
  const category = normalize(ingredient.category ?? "");

  return (
    ingredient.role === "milk" ||
    ingredient.role === "cream" ||
    ingredient.role === "nfdm" ||
    /dairy only/.test(category) ||
    /whole milk|heavy cream|skim milk powder|nfdm|milk powder|smp/.test(name)
  );
}

function makeLocalizedName(base: string) {
  return {
    name: base,
    name_en: base,
    name_es: base,
    name_it: base,
  };
}

export function RecipeLabScreen({
  ingredients,
  preset,
  onAssistBridgeChange,
  onQuickAddIngredient,
  onRecipeSaved,
}: RecipeLabScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { language, setLanguage } = useMobileLanguage();
  const lab = useRecipeLab(ingredients, language);
  const {
    setKeyword: setLabKeyword,
    setArchetypeKey: setLabArchetypeKey,
    setBaseType: setLabBaseType,
    applyAssistantCommand,
    undoAssistantChange,
    clearAssistantMessage,
    assistantMessage,
    assistantHint,
    baseType,
    keyword,
  } = lab;
  const [isPrinting, setIsPrinting] = useState(false);
  const [gramsEditor, setGramsEditor] = useState<LabIngredient | null>(null);
  const [gramsDraft, setGramsDraft] = useState("");
  const [selectedRole, setSelectedRole] = useState<string | null>("flavor");
  const [percentEditorRole, setPercentEditorRole] = useState<string | null>(null);
  const [showSolidsAdvice, setShowSolidsAdvice] = useState(false);
  const [batchEditorOpen, setBatchEditorOpen] = useState(false);
  const [batchDraft, setBatchDraft] = useState("");
  const [archetypePickerOpen, setArchetypePickerOpen] = useState(false);
  const [flavorPickerOpen, setFlavorPickerOpen] = useState(false);
  const [flavorSearch, setFlavorSearch] = useState("");
  const [pantryPickerMode, setPantryPickerMode] = useState<"flavor" | "all">("flavor");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddPac, setQuickAddPac] = useState("0");
  const [quickAddPod, setQuickAddPod] = useState("0");
  const [equipmentUnits, setEquipmentUnits] = useState<EquipmentUnitRecord[]>([]);
  const [displayCases, setDisplayCases] = useState<DisplayCaseRecord[]>([]);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizeScale, setFinalizeScale] = useState<"lab" | "production">("lab");
  const [finalizeName, setFinalizeName] = useState("");
  const [finalizeCategory, setFinalizeCategory] = useState("Gelato");
  const [showFinalizeCategoryOptions, setShowFinalizeCategoryOptions] = useState(false);
  const [isSavingRecipe, setIsSavingRecipe] = useState(false);
 
  const handleAssistSubmit = useCallback(
    (command: string) => applyAssistantCommand(command, setLanguage),
    [applyAssistantCommand, setLanguage]
  );

  const archetypeLabel = useMemo(
    () => ARCHETYPE_OPTIONS.find((option) => option.key === lab.archetypeKey)?.label ?? "Custom Lab",
    [lab.archetypeKey]
  );

  const activePercentIngredient =
    lab.ingredients.find((ingredient) => ingredient.role === percentEditorRole) ?? null;

  const activePercentValue = activePercentIngredient
    ? (activePercentIngredient.grams / Math.max(lab.batchWeightGrams, 1)) * 100
    : 0;
  const batchMixKg = lab.batchWeightGrams / 1000;
  const mixLiters = batchMixKg / 1.08;
  const overrunMultiplier = baseType === "water" ? 1.25 : 1.35;
  const predictedYieldLiters = mixLiters * overrunMultiplier;
  const predictedYieldOunces = predictedYieldLiters * 33.814;
  const activeEquipment = equipmentUnits[0] ?? null;
  const productionBatchWeightGrams = activeEquipment
    ? Math.round(activeEquipment.max_batch_l * 1.08 * 1000)
    : lab.batchWeightGrams;
  const scaleFactor =
    finalizeScale === "production"
      ? productionBatchWeightGrams / Math.max(lab.batchWeightGrams, 1)
      : 1;
  const suggestedCase =
    displayCases.find(
      (displayCase) =>
        lab.metrics.pac >= displayCase.pac_range_min && lab.metrics.pac <= displayCase.pac_range_max
    ) ?? null;
  const visibleLabIngredients = useMemo(
    () =>
      lab.ingredients.filter((ingredient) => {
        if (baseType === "dairy") {
          return !isWaterOnlyIngredient(ingredient);
        }

        if (baseType === "water") {
          return !isDairyOnlyIngredient(ingredient);
        }

        return true;
      }),
    [baseType, lab.ingredients]
  );
  const finalizedIngredients = useMemo(
    () =>
      visibleLabIngredients.map((ingredient) => ({
        name: ingredient.name,
        grams: ingredient.grams * scaleFactor,
        percentage: (ingredient.grams / Math.max(lab.batchWeightGrams, 1)) * 100,
      })),
    [lab.batchWeightGrams, scaleFactor, visibleLabIngredients]
  );
  const finalizeCategoryOptions = useMemo(() => {
    const dynamic = ingredients
      .map((ingredient) => ingredient.category?.trim())
      .filter((value): value is string => Boolean(value))
      .filter((value, index, values) => values.indexOf(value) === index);

    return ["Gelato", "Nut", "Chocolate", "Fruit", "Seasonal", ...dynamic].filter(
      (value, index, values) => values.indexOf(value) === index
    );
  }, [ingredients]);

  const flavorIngredients = useMemo(
    () => ingredients.filter((ingredient) => ingredient.is_flavor === true),
    [ingredients]
  );

  const pantryPickerOptions = useMemo(
    () => (pantryPickerMode === "all" ? ingredients : flavorIngredients),
    [flavorIngredients, ingredients, pantryPickerMode]
  );

  const filteredPantryOptions = useMemo(() => {
    const value = normalize(flavorSearch);

    return [...pantryPickerOptions]
      .sort((left, right) => {
        return left.name.localeCompare(right.name);
      })
      .filter((ingredient) => {
        if (!value) {
          return true;
        }

        const searchable = normalize(
          [ingredient.name, ingredient.name_en, ingredient.name_it, ingredient.name_es, ingredient.category]
            .filter(Boolean)
            .join(" ")
        );

        return searchable.includes(value);
      })
      .slice(0, 60);
  }, [flavorSearch, pantryPickerOptions]);

  const assistBridge = useMemo<MobileAssistBridge>(
    () => ({
      hint: assistantHint,
      message: assistantMessage,
      onSubmit: handleAssistSubmit,
      onUndo: undoAssistantChange,
      onDismiss: clearAssistantMessage,
    }),
    [assistantHint, assistantMessage, clearAssistantMessage, handleAssistSubmit, undoAssistantChange]
  );

  useEffect(() => {
    let active = true;

    void loadEquipmentSettings().then((snapshot) => {
      if (!active) {
        return;
      }

      setEquipmentUnits(snapshot.units);
      setDisplayCases(snapshot.displayCases);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!preset?.token) {
      return;
    }

    setLabKeyword(preset.keyword);
    setLabArchetypeKey(preset.archetypeKey);
    setLabBaseType(preset.baseType);
    setPercentEditorRole(null);
    setSelectedRole("flavor");
  }, [
    setLabArchetypeKey,
    setLabBaseType,
    setLabKeyword,
    preset?.archetypeKey,
    preset?.baseType,
    preset?.keyword,
    preset?.token,
  ]);

  useEffect(() => {
    if (!onAssistBridgeChange) {
      return;
    }

    onAssistBridgeChange(assistBridge);

    return () => onAssistBridgeChange(null);
  }, [assistBridge, onAssistBridgeChange]);

  async function handlePrintRecipe() {
    setIsPrinting(true);

    try {
      await printRecipe({
        title: lab.keyword.trim()
          ? `${lab.keyword.trim()} Production Sheet`
          : "Gelato Miracoli Production Sheet",
        ingredients: visibleLabIngredients,
        metrics: lab.metrics,
        batchLiters: predictedYieldLiters,
        equipmentLabel: lab.equipmentLabel,
        productionDate: new Date(),
        language,
      });
    } finally {
      setIsPrinting(false);
    }
  }

  function openGramsEditor(ingredient: LabIngredient) {
    setSelectedRole(ingredient.role);
    setPercentEditorRole(null);
    setGramsEditor(ingredient);
    setGramsDraft(String(Math.round(ingredient.grams)));
  }

  async function submitGramsEditor() {
    if (!gramsEditor) {
      return;
    }

    const next = Number(gramsDraft.replace(/[^0-9.]/g, ""));
    if (!Number.isNaN(next)) {
      await lab.updateManualWeight(gramsEditor.role, next);
    }
    setGramsEditor(null);
  }

  function openPercentEditor(ingredient: LabIngredient) {
    setSelectedRole(ingredient.role);
    setPercentEditorRole((current) => (current === ingredient.role ? null : ingredient.role));
  }

  async function submitBatchValue() {
    const next = Number(batchDraft.replace(/[^0-9.]/g, ""));

    if (!Number.isNaN(next)) {
      await lab.setBatchLiters(next);
    }

    setBatchEditorOpen(false);
  }

  function handleSelectFlavor(ingredient: MobileIngredient) {
    void lab.setRoleIngredient("flavor", ingredient);
    lab.setKeyword(ingredient.name);

    if (lab.archetypeKey === "clean-label") {
      setFlavorPickerOpen(false);
      setFlavorSearch("");
      return;
    }

    if (/vegan/i.test(ingredient.name)) {
      setLabArchetypeKey("vegan");
      setLabBaseType("water");
    } else if (/zero sugar|sugar free|sugar-free/i.test(ingredient.name)) {
      setLabArchetypeKey("sugar-free");
    } else if (FRUIT_MATCH.test(ingredient.name) && baseType === "water") {
      setLabArchetypeKey("fruit-sorbet");
    } else if (FRUIT_MATCH.test(ingredient.name) && baseType === "dairy") {
      setLabArchetypeKey("milk-based-standard");
    } else if (/chocolate|cocoa|hazelnut|pistachio|nocciola|pistacchio/i.test(ingredient.name)) {
      setLabArchetypeKey("high-fat");
    }

    setFlavorPickerOpen(false);
    setFlavorSearch("");
  }

  function openFlavorPicker() {
    setPantryPickerMode("flavor");
    setFlavorSearch("");
    setFlavorPickerOpen(true);
  }

  function openPantryPicker() {
    setPantryPickerMode("all");
    setFlavorSearch("");
    setFlavorPickerOpen(true);
  }

  async function handleSelectPantryIngredient(ingredient: MobileIngredient) {
    if (pantryPickerMode === "flavor" || ingredient.is_flavor) {
      handleSelectFlavor(ingredient);
      return;
    }

    const assignedRole = await lab.assignIngredient(ingredient);
    setSelectedRole(assignedRole);
    setPercentEditorRole(null);
    setShowSolidsAdvice(false);
    setFlavorPickerOpen(false);
    setFlavorSearch("");
  }

  function handleBaseTypeChange(nextBaseType: BaseType) {
    setSelectedRole(null);
    setPercentEditorRole(null);
    setLabBaseType(nextBaseType);

    if (lab.archetypeKey === "clean-label") {
      setLabArchetypeKey("clean-label");
    } else if (FRUIT_MATCH.test(keyword)) {
      setLabArchetypeKey(nextBaseType === "water" ? "fruit-sorbet" : "milk-based-standard");
    }
  }

  function resetQuickAddForm() {
    setQuickAddName("");
    setQuickAddPac("0");
    setQuickAddPod("0");
  }

  function applyArchetypeSelection(
    nextArchetypeKey: (typeof ARCHETYPE_OPTIONS)[number]["key"]
  ) {
    setPercentEditorRole(null);
    lab.setArchetypeKey(nextArchetypeKey);

    if (nextArchetypeKey === "fruit-sorbet" || nextArchetypeKey === "vegan") {
      lab.setBaseType("water");

      if (nextArchetypeKey === "vegan") {
        lab.setKeyword("Chocolate");
      }
    } else if (nextArchetypeKey === "clean-label") {
      lab.setBaseType(baseType);
    } else if (
      nextArchetypeKey === "milk-based-standard" ||
      nextArchetypeKey === "high-fat" ||
      nextArchetypeKey === "sugar-free"
    ) {
      lab.setBaseType("dairy");
    }

    setArchetypePickerOpen(false);
  }

  function openQuickAddSheet(seedName = "") {
    setQuickAddName(seedName || flavorSearch.trim() || keyword.trim());
    setFlavorPickerOpen(false);
    setQuickAddOpen(true);
  }

  function handleAddGhostSuggestion(ingredient: LabIngredient) {
    if (!ingredient.ghost) {
      return;
    }

    onQuickAddIngredient?.({
      ...ingredient,
      name: ingredient.name.replace(/^\[\s*SUGGESTED:\s*/i, "").replace(/\s*\]$/, ""),
      is_master: false,
      status: "draft",
    });
  }

  function handleQuickAdd() {
    const nextIngredient: MobileIngredient = {
      ...makeLocalizedName(quickAddName || "Custom Flavor"),
      category: "Flavor",
      is_flavor: true,
      fat_pct: 0,
      sugar_pct: 0,
      total_solids_pct: 0,
      pac_value: Number(quickAddPac) || 0,
      pod_value: Number(quickAddPod) || 0,
      dosage_guideline_per_kg: 100,
      average_market_cost: 0,
      is_master: false,
      status: "draft",
    };

    onQuickAddIngredient?.(nextIngredient);
    handleSelectFlavor(nextIngredient);
    setQuickAddOpen(false);
    resetQuickAddForm();
  }

  function openFinalizeModal() {
    setFinalizeName(lab.keyword.trim() || "New Recipe");
    setFinalizeCategory(
      ingredients.find((ingredient) => ingredient.name === lab.keyword)?.category?.trim() || "Gelato"
    );
    setFinalizeScale("lab");
    setShowFinalizeCategoryOptions(false);
    setFinalizeOpen(true);
  }

  async function handleSaveToVault() {
    if (!finalizeName.trim()) {
      Alert.alert("Recipe name required", "Give this formula a name before saving it.");
      return;
    }

    setIsSavingRecipe(true);

    try {
      await saveRecipeToLibrary({
        recipeName: finalizeName.trim(),
        totalMixWeight:
          finalizeScale === "production" ? productionBatchWeightGrams : lab.batchWeightGrams,
        equipmentId: activeEquipment?.id ?? null,
        activeCaseId: suggestedCase?.id ?? null,
        isOnDisplay: Boolean(suggestedCase),
        isSorbet: baseType === "water",
        ingredients: finalizedIngredients,
        logicSnapshot: {
          archetypeKey: lab.archetypeKey,
          flavorCategory: finalizeCategory,
          totalPac: lab.metrics.pac,
          totalPod: lab.metrics.pod,
          totalFat: lab.metrics.fat,
          totalSolids: lab.metrics.solids,
          ingredients_json: finalizedIngredients,
          activeCaseId: suggestedCase?.id ?? null,
          displayCaseName: suggestedCase?.name ?? null,
          equipmentLabel: activeEquipment ? `${activeEquipment.brand} ${activeEquipment.model}` : null,
          scaleMode: finalizeScale,
          predictedYieldLiters:
            finalizeScale === "production"
              ? (productionBatchWeightGrams / 1000 / 1.08) * overrunMultiplier
              : predictedYieldLiters,
        },
      });

      await onRecipeSaved?.();
      setFinalizeOpen(false);
      Alert.alert("Saved to Vault", "The recipe has been finalized and saved to your library.");
    } catch (error) {
      Alert.alert(
        "Save failed",
        error instanceof Error ? error.message : "Unable to save this recipe right now."
      );
    } finally {
      setIsSavingRecipe(false);
    }
  }

  async function handlePrintProductionPdf() {
    try {
      await generateProductionPDF({
        recipeName: finalizeName.trim() || lab.keyword || "Production Recipe",
        createdAt: new Date(),
        ingredients: finalizedIngredients.map((ingredient) => ({
          name: ingredient.name,
          grams: ingredient.grams,
        })),
        specs: {
          pac: lab.metrics.pac,
          pod: lab.metrics.pod,
          fat: lab.metrics.fat,
          solids: lab.metrics.solids,
        },
        equipment: activeEquipment,
        displayCase: suggestedCase,
      });
    } catch (error) {
      Alert.alert(
        "Print failed",
        error instanceof Error ? error.message : "Unable to generate the production PDF."
      );
    }
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={["#0A0B14", "#000000"]} style={styles.gradientBackground} />
      <View style={styles.commandRow}>
        <View style={styles.labHeader}>
          <Text style={styles.labHeaderKicker}>MIRACOLI PHYSICS ENGINE</Text>
          <Text style={styles.labHeaderTitle}>RECIPE LAB</Text>
        </View>

        <GlassCard intensity={80} style={styles.topPanelCard} contentStyle={styles.topPanelCardContent}>
          <View style={styles.flavorRow}>
            <Pressable
              onPress={openFlavorPicker}
              style={styles.flavorSelector}
            >
              <Text style={styles.selectorLabel}>PRIMARY FLAVOR</Text>
              <View style={styles.selectorValueRow}>
                <Text style={styles.selectorValue}>{lab.keyword}</Text>
                <Text style={styles.selectorChevron}>v</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => openQuickAddSheet()}
              style={styles.quickAddButton}
              hitSlop={10}
            >
              <Text style={styles.quickAddButtonText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.controlRow}>
            <View style={styles.baseToggle}>
              <Text style={styles.baseToggleLabel}>BASE</Text>
              <View style={styles.baseToggleRow}>
                <Text style={[styles.baseToggleText, lab.baseType === "water" && styles.baseToggleTextMuted]}>
                  Dairy
                </Text>
                <Switch
                  value={lab.baseType === "water"}
                  onValueChange={(value) => handleBaseTypeChange(value ? "water" : "dairy")}
                  trackColor={{ false: "#1A1A1A", true: "#1A1A1A" }}
                  thumbColor={theme.colors.text}
                />
                <Text style={[styles.baseToggleText, lab.baseType === "dairy" && styles.baseToggleTextMuted]}>
                  Water
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => void handlePrintRecipe()}
              style={styles.printButton}
              accessibilityRole="button"
              accessibilityLabel={isPrinting ? t("preparingPrint") : t("printRecipe")}
            >
              <Text style={styles.printButtonText}>{isPrinting ? "..." : "PR"}</Text>
            </Pressable>
          </View>
        </GlassCard>
      </View>

      <GlassCard intensity={72} style={styles.archetypeCard} contentStyle={styles.archetypeCardContent}>
        <Pressable
          onPress={() => setArchetypePickerOpen(true)}
          style={styles.archetypeSelector}
        >
          <Text style={styles.selectorLabel}>STRUCTURE ARCHETYPE</Text>
          <View style={styles.selectorValueRow}>
            <Text style={styles.selectorValue}>{archetypeLabel}</Text>
            <Text style={styles.selectorChevron}>v</Text>
          </View>
        </Pressable>
      </GlassCard>

      <PhysicsHud
        metrics={lab.metrics}
        solidsAdvice={lab.proactiveAlert}
        showSolidsAdvice={showSolidsAdvice}
        onToggleSolidsAdvice={() => setShowSolidsAdvice((current) => !current)}
      />

      <GlassCard intensity={80} style={styles.batchCard} contentStyle={styles.batchCardContent}>
        <View style={styles.batchControlBar}>
          <Text style={styles.batchControlLabel}>BATCH MIX (KG)</Text>
          <View style={styles.batchControls}>
            <Pressable
              onPress={() => void lab.setBatchLiters(Math.max(0.5, batchMixKg - 0.5))}
              style={styles.batchStepButton}
            >
              <Text style={styles.inactiveButtonText}>-</Text>
            </Pressable>
              <Pressable
                onPress={() => {
                  setBatchDraft(batchMixKg.toFixed(1));
                  setBatchEditorOpen(true);
                }}
                style={styles.batchValueButton}
              >
                <AnimatedLabReadout value={`${batchMixKg.toFixed(1)} KG`} />
              </Pressable>
            <Pressable
              onPress={() => void lab.setBatchLiters(batchMixKg + 0.5)}
              style={styles.batchStepButton}
            >
              <Text style={styles.inactiveButtonText}>+</Text>
            </Pressable>
            </View>
            <View style={styles.yieldRow}>
              <AnimatedLabReadout
                variant="secondary"
                value={`PREDICTED YIELD: ${predictedYieldLiters.toFixed(2)} L // ${predictedYieldOunces.toFixed(1)} FL OZ`}
              />
            </View>
        </View>
      </GlassCard>

      <ScrollView
        style={styles.body}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        onTouchStart={() => {
          setSelectedRole(null);
          setPercentEditorRole(null);
          setShowSolidsAdvice(false);
        }}
        contentContainerStyle={[
          styles.bodyContent,
          { paddingBottom: 48 + Math.max(insets.bottom, 20) },
        ]}
      >
        <View style={styles.contentShell}>
          <GlassCard intensity={72} style={styles.tableCard} contentStyle={styles.tableCardContent}>
            <RecipeTable
              ingredients={visibleLabIngredients}
              batchWeightGrams={lab.batchWeightGrams}
              selectedRole={selectedRole}
              editingPercentRole={percentEditorRole}
              onSelectRow={(ingredient) => {
                if (ingredient.role === "flavor") {
                  setSelectedRole("flavor");
                  setPercentEditorRole(null);
                  setShowSolidsAdvice(false);
                  openFlavorPicker();
                  return;
                }

                setSelectedRole(ingredient.role);
                setShowSolidsAdvice(false);
              }}
              onPressPercent={openPercentEditor}
              onPressGrams={openGramsEditor}
              onToggleLock={(ingredient) => void lab.toggleLock(ingredient.role)}
              onDeleteRow={(ingredient) => void lab.removeIngredient(ingredient.id ?? ingredient.role)}
              renderPercentOverlay={(ingredient) =>
                ingredient.role === "flavor" ? (
                  <MaestroSlider
                    label={`${t("intensity")} // ${archetypeLabel}`}
                    value={activePercentValue}
                    minimumValue={4}
                    maximumValue={20}
                    onChange={(next) => void lab.setIngredientPercent("flavor", next)}
                    compact
                  />
                ) : (
                  <Text style={styles.inlineHint}>
                    {t("intensity")} control is reserved for the active flavor load.
                  </Text>
                )
              }
              onAddSuggestion={(ingredient) => handleAddGhostSuggestion(ingredient)}
            />
            <Pressable onPress={openPantryPicker} style={styles.addIngredientButton}>
              <Text style={styles.addIngredientButtonText}>+ Add Ingredient</Text>
            </Pressable>
            <Pressable onPress={openFinalizeModal} style={styles.finalizeButton}>
              <Text style={styles.finalizeButtonText}>Finalize Recipe</Text>
            </Pressable>
          </GlassCard>
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(gramsEditor)}
        onRequestClose={() => setGramsEditor(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayLabel}>GRAMS</Text>
            <Text style={styles.overlayTitle}>{gramsEditor?.name}</Text>
            <TextInput
              value={gramsDraft}
              onChangeText={setGramsDraft}
              keyboardType="decimal-pad"
              autoFocus
              style={styles.overlayInput}
            />
            <View style={styles.overlayActions}>
              <Pressable onPress={() => setGramsEditor(null)} style={styles.inactiveButton}>
                <Text style={styles.inactiveButtonText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={() => void submitGramsEditor()} style={styles.activeButton}>
                <Text style={styles.activeButtonText}>APPLY</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={batchEditorOpen}
        onRequestClose={() => setBatchEditorOpen(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <Text style={styles.overlayLabel}>BATCH</Text>
            <Text style={styles.overlayTitle}>Target Mix Weight</Text>
            <TextInput
              value={batchDraft}
              onChangeText={setBatchDraft}
              keyboardType="decimal-pad"
              autoFocus
              style={styles.overlayInput}
            />
            <View style={styles.overlayActions}>
              <Pressable onPress={() => setBatchEditorOpen(false)} style={styles.inactiveButton}>
                <Text style={styles.inactiveButtonText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={() => void submitBatchValue()} style={styles.activeButton}>
                <Text style={styles.activeButtonText}>APPLY</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={archetypePickerOpen}
        onRequestClose={() => setArchetypePickerOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setArchetypePickerOpen(false)} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.overlayLabel}>STRUCTURE ARCHETYPE</Text>
            <ScrollView style={styles.flavorList}>
              {ARCHETYPE_OPTIONS.map((option) => (
                <Pressable
                  key={option.key}
                  onPress={() => applyArchetypeSelection(option.key)}
                  style={styles.flavorOption}
                >
                  <View style={styles.flavorOptionHeader}>
                    <Text style={styles.flavorOptionName}>{option.label}</Text>
                    {lab.archetypeKey === option.key ? (
                      <Text style={styles.flavorOptionMeta}>ACTIVE</Text>
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.overlayActions}>
              <Pressable
                onPress={() => setArchetypePickerOpen(false)}
                style={styles.activeButton}
              >
                <Text style={styles.activeButtonText}>DONE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={flavorPickerOpen}
        onRequestClose={() => setFlavorPickerOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFlavorPickerOpen(false)} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.overlayLabel}>
              {pantryPickerMode === "all" ? "ADD INGREDIENT" : "SELECT FLAVOR"}
            </Text>
            <TextInput
              value={flavorSearch}
              onChangeText={setFlavorSearch}
              placeholder="Search pantry ingredients..."
              placeholderTextColor={theme.colors.muted}
              style={styles.overlayInput}
            />
            <ScrollView style={styles.flavorList}>
              {filteredPantryOptions.length > 0 ? (
                filteredPantryOptions.map((ingredient) => (
                  <Pressable
                    key={`${ingredient.id ?? ingredient.name}-${ingredient.name}`}
                    onPress={() => void handleSelectPantryIngredient(ingredient)}
                    style={styles.flavorOption}
                  >
                    <View style={styles.flavorOptionHeader}>
                      <View style={styles.flavorOptionNameRow}>
                        <Text style={styles.flavorOptionName}>{ingredient.name}</Text>
                        {ingredient.is_verified ? (
                          <MaterialCommunityIcons
                            name="check-decagram"
                            size={14}
                            color="#00E5FF"
                            style={styles.verifiedIcon}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.flavorOptionStat}>
                        {Math.round(ingredient.pac_value ?? 0)}/{Math.round(ingredient.pod_value ?? 0)}
                      </Text>
                    </View>
                    <Text style={styles.flavorOptionMeta}>{ingredient.category ?? "Ingredient"}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyFlavorState}>
                  <Text style={styles.flavorOptionName}>No pantry match yet.</Text>
                  <Text style={styles.flavorOptionMeta}>
                    {pantryPickerMode === "all"
                      ? "Try a broader search or sync more pantry ingredients."
                      : "Create a fast custom ingredient and keep balancing without leaving the lab."}
                  </Text>
                </View>
              )}
            </ScrollView>
            <View style={styles.overlayActions}>
              {pantryPickerMode === "flavor" ? (
                <Pressable onPress={() => openQuickAddSheet()} style={styles.inactiveButton}>
                  <Text style={styles.inactiveButtonText}>
                    {filteredPantryOptions.length > 0 ? "+ QUICK ADD" : "+ CREATE NEW"}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => setFlavorPickerOpen(false)} style={styles.activeButton}>
                <Text style={styles.activeButtonText}>DONE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={finalizeOpen}
        onRequestClose={() => setFinalizeOpen(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable style={styles.sheetBackdrop} onPress={() => setFinalizeOpen(false)} />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.overlayLabel}>READY FOR PRODUCTION?</Text>
            <TextInput
              value={finalizeName}
              onChangeText={setFinalizeName}
              placeholder="Recipe Name"
              placeholderTextColor={theme.colors.muted}
              style={styles.overlayInput}
            />

            <View style={styles.finalizeToggleRow}>
              <Pressable
                onPress={() => setFinalizeScale("lab")}
                style={[
                  styles.finalizeToggleButton,
                  finalizeScale === "lab" && styles.finalizeToggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.finalizeToggleText,
                    finalizeScale === "lab" && styles.finalizeToggleTextActive,
                  ]}
                >
                  {`Lab Batch (${batchMixKg.toFixed(1)}kg)`}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFinalizeScale("production")}
                style={[
                  styles.finalizeToggleButton,
                  finalizeScale === "production" && styles.finalizeToggleButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.finalizeToggleText,
                    finalizeScale === "production" && styles.finalizeToggleTextActive,
                  ]}
                >
                  {`Full Production (${(productionBatchWeightGrams / 1000).toFixed(1)}kg)`}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowFinalizeCategoryOptions((current) => !current)}
              style={styles.finalizeSelector}
            >
              <Text style={styles.selectorLabel}>FLAVOR CATEGORY</Text>
              <View style={styles.selectorValueRow}>
                <Text style={styles.selectorValue}>{finalizeCategory}</Text>
                <Text style={styles.selectorChevron}>v</Text>
              </View>
            </Pressable>

            {showFinalizeCategoryOptions ? (
              <View style={styles.finalizeCategoryList}>
                {finalizeCategoryOptions.map((option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      setFinalizeCategory(option);
                      setShowFinalizeCategoryOptions(false);
                    }}
                    style={styles.finalizeCategoryOption}
                  >
                    <Text style={styles.flavorOptionName}>{option}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <View style={styles.finalizeInfoCard}>
              <Text style={styles.selectorLabel}>TARGET CASE</Text>
              <Text style={styles.finalizeInfoValue}>
                {suggestedCase
                  ? `${suggestedCase.name} // PAC ${suggestedCase.pac_range_min}-${suggestedCase.pac_range_max}`
                  : "No matching display case range yet"}
              </Text>
              <Text style={styles.finalizeInfoMeta}>
                {activeEquipment
                  ? `Machine: ${activeEquipment.brand} ${activeEquipment.model}`
                  : "Machine: Default Batch Freezer"}
              </Text>
            </View>

            <View style={styles.overlayActions}>
              <Pressable onPress={() => void handlePrintProductionPdf()} style={styles.inactiveButton}>
                <Text style={styles.inactiveButtonText}>PRINT PDF</Text>
              </Pressable>
              <Pressable onPress={() => void handleSaveToVault()} style={styles.activeButton}>
                <Text style={styles.activeButtonText}>
                  {isSavingRecipe ? "SAVING" : "SAVE TO VAULT"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={quickAddOpen}
        onRequestClose={() => {
          setQuickAddOpen(false);
          resetQuickAddForm();
        }}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => {
              setQuickAddOpen(false);
              resetQuickAddForm();
            }}
          />
          <View style={styles.sheetCard}>
            <View style={styles.sheetHandle} />
            <Text style={styles.overlayLabel}>QUICK INGEST</Text>
            <TextInput
              value={quickAddName}
              onChangeText={setQuickAddName}
              placeholder="Walnut Paste"
              placeholderTextColor={theme.colors.muted}
              style={styles.overlayInput}
            />
            <Text style={styles.quickAddCategory}>Category: Flavor</Text>
            <View style={styles.quickAddGrid}>
              <TextInput value={quickAddPac} onChangeText={setQuickAddPac} keyboardType="decimal-pad" style={styles.quickAddInput} placeholder="PAC" placeholderTextColor={theme.colors.muted} />
              <TextInput value={quickAddPod} onChangeText={setQuickAddPod} keyboardType="decimal-pad" style={styles.quickAddInput} placeholder="POD" placeholderTextColor={theme.colors.muted} />
            </View>
            <View style={styles.overlayActions}>
              <Pressable
                onPress={() => {
                  setQuickAddOpen(false);
                  resetQuickAddForm();
                }}
                style={styles.inactiveButton}
              >
                <Text style={styles.inactiveButtonText}>CANCEL</Text>
              </Pressable>
              <Pressable onPress={handleQuickAdd} style={styles.activeButton}>
                <Text style={styles.activeButtonText}>INGEST</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: 16,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  commandRow: {
    gap: 14,
    paddingHorizontal: 20,
  },
  labHeader: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 8,
  },
  labHeaderKicker: {
    color: "#D4AF37",
    fontSize: 10,
    letterSpacing: 1.8,
    fontFamily: theme.typography.mono,
  },
  labHeaderTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
    textAlign: "center",
  },
  topPanelCard: {
    width: "100%",
  },
  topPanelCardContent: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    backgroundColor: "rgba(10, 10, 15, 0.45)",
  },
  flavorRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
  },
  flavorSelector: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(214, 212, 206, 0.7)",
    paddingBottom: 10,
  },
  selectorLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.3,
    fontFamily: theme.typography.mono,
  },
  selectorValue: {
    color: theme.colors.text,
    fontSize: 18,
    marginTop: 6,
    fontFamily: theme.typography.sans,
  },
  selectorValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 6,
  },
  selectorChevron: {
    color: "rgba(255, 255, 255, 0.68)",
    fontSize: 18,
    fontFamily: theme.typography.sans,
  },
  quickAddButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "rgba(214, 212, 206, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18, 18, 18, 0.92)",
  },
  quickAddButtonText: {
    color: "#D6D4CE",
    fontSize: 24,
    lineHeight: 24,
    fontFamily: theme.typography.sans,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  baseToggle: {
    minWidth: 120,
    alignItems: "flex-start",
  },
  baseToggleLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.2,
    marginBottom: 4,
    fontFamily: theme.typography.mono,
  },
  baseToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  baseToggleText: {
    color: theme.colors.text,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  baseToggleTextMuted: {
    color: theme.colors.muted,
  },
  archetypeRow: {
    display: "none",
  },
  archetypeSelector: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: "transparent",
  },
  archetypeCard: {
    marginHorizontal: 20,
  },
  archetypeCardContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(10, 10, 15, 0.45)",
  },
  archetypeChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  archetypeChipActive: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  archetypeChipText: {
    color: theme.colors.text,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  archetypeChipTextActive: {
    color: theme.colors.background,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingBottom: 64,
  },
  contentShell: {
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 20,
  },
  tableCard: {
    width: "100%",
  },
  tableCardContent: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "rgba(10, 10, 15, 0.45)",
  },
  addIngredientButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#333333",
    borderStyle: "dashed",
    borderRadius: 8,
    alignItems: "center",
  },
  addIngredientButtonText: {
    color: "#A3A3A3",
    fontSize: 13,
    fontFamily: theme.typography.mono,
  },
  finalizeButton: {
    marginTop: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingVertical: 16,
    alignItems: "center",
  },
  finalizeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.sans,
    fontWeight: "600",
  },
  batchControlBar: {
    alignSelf: "center",
    width: "100%",
    gap: 8,
    maxWidth: 320,
  },
  batchCard: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
  },
  batchCardContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(10, 10, 15, 0.45)",
  },
  batchControlLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
    textAlign: "center",
  },
  batchControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  batchStepButton: {
    width: 52,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  batchValueButton: {
    minWidth: 144,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
  },
  batchValueText: {
    color: "#FF073A",
    fontSize: 18,
    fontFamily: "Courier",
    fontWeight: "700",
    textShadowColor: "rgba(255, 7, 58, 0.6)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  yieldRow: {
    alignItems: "center",
    justifyContent: "center",
  },
  predictedYieldText: {
    color: "#707070",
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: theme.typography.mono,
  },
  inlineHint: {
    color: theme.colors.muted,
    fontSize: 10,
    lineHeight: 14,
    fontFamily: theme.typography.mono,
    paddingVertical: 4,
  },
  activeButton: {
    backgroundColor: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  activeButtonText: {
    color: theme.colors.background,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  printButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  printButtonText: {
    color: theme.colors.text,
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  inactiveButton: {
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  inactiveButtonText: {
    color: theme.colors.text,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  overlayCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
    gap: 14,
    maxHeight: "76%",
  },
  overlayLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  overlayTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontFamily: theme.typography.sans,
  },
  overlayInput: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.text,
    color: theme.colors.text,
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: theme.typography.mono,
  },
  overlayActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.36)",
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetCard: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
    maxHeight: "76%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 4,
    borderRadius: 999,
    backgroundColor: theme.colors.border,
  },
  flavorList: {
    maxHeight: 320,
  },
  flavorOption: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 14,
    gap: 4,
  },
  flavorOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  flavorOptionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  flavorOptionName: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: theme.typography.sans,
  },
  verifiedIcon: {
    textShadowColor: "rgba(0, 229, 255, 0.7)",
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 0 },
  },
  flavorOptionMeta: {
    color: theme.colors.muted,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  flavorOptionStat: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 18,
    fontFamily: theme.typography.sans,
  },
  quickAddCategory: {
    color: theme.colors.muted,
    fontSize: 11,
    fontFamily: theme.typography.mono,
  },
  finalizeToggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  finalizeToggleButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  finalizeToggleButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderColor: "rgba(255, 255, 255, 0.26)",
  },
  finalizeToggleText: {
    color: "#A3A3A3",
    fontSize: 11,
    fontFamily: theme.typography.mono,
    textAlign: "center",
  },
  finalizeToggleTextActive: {
    color: "#FFFFFF",
  },
  finalizeSelector: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  finalizeCategoryList: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  finalizeCategoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  finalizeInfoCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 6,
  },
  finalizeInfoValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: theme.typography.sans,
  },
  finalizeInfoMeta: {
    color: theme.colors.muted,
    fontSize: 11,
    fontFamily: theme.typography.mono,
  },
  emptyFlavorState: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 16,
    gap: 6,
  },
  quickAddGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickAddInput: {
    width: "48%",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 0,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
});
