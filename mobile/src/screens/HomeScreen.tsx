import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  Animated,
  ActionSheetIOS,
  Alert,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LanguageToggle } from "../components/LanguageToggle";
import { useMobileLanguage } from "../i18n/LanguageProvider";
import { loadEquipmentSettings } from "../lib/equipmentSettings";
import { theme } from "../theme";

type RecentFormula = {
  id: string;
  title: string;
  archetype: string;
};

type DisplayCaseCard = {
  id: string;
  name: string;
  total: number;
  tempC: string;
  style: string;
};

type HomeScreenProps = {
  profileName?: string;
  activeEquipmentLabel?: string;
  recipeCount?: number;
  onViewLibrary?: () => void;
  onEditBatchFreezer?: () => void;
  onEditDisplayCases?: () => void;
};

type MobileLanguage = "en" | "es" | "it";

type HomeCopy = {
  greeting: string;
  synced: string;
  activeEquipment: string;
  batchFreezer: string;
  displayCaseLabel: string;
  styleLabel: string;
  recipeBook: string;
  viewFullLibrary: string;
  editBatchFreezer: string;
  editDisplayCases: string;
  cancel: string;
  batchFreezerManager: string;
  displayCaseManager: string;
  addBatchFreezer: string;
  addDisplayCase: string;
  close: string;
  temperature: string;
  style: string;
  remove: string;
  save: string;
};

const HOME_COPY: Record<MobileLanguage, HomeCopy> = {
  en: {
    greeting: "Good Morning",
    synced: "SYNCED",
    activeEquipment: "ACTIVE EQUIPMENT",
    batchFreezer: "BATCH FREEZER",
    displayCaseLabel: "DISPLAY CASE",
    styleLabel: "STYLE",
    recipeBook: "RECIPE BOOK",
    viewFullLibrary: "View Full Library ->",
    editBatchFreezer: "Edit Batch Freezer",
    editDisplayCases: "Edit Display Cases",
    cancel: "Cancel",
    batchFreezerManager: "Batch Freezer Manager",
    displayCaseManager: "Display Case Manager",
    addBatchFreezer: "+ Add Batch Freezer",
    addDisplayCase: "+ Add Display Case",
    close: "Close",
    temperature: "Temperature",
    style: "Style",
    remove: "Remove",
    save: "Save",
  },
  es: {
    greeting: "Buenos Días",
    synced: "SINCRONIZADO",
    activeEquipment: "EQUIPO ACTIVO",
    batchFreezer: "MANTECADORA",
    displayCaseLabel: "VITRINA",
    styleLabel: "ESTILO",
    recipeBook: "RECETARIO",
    viewFullLibrary: "Ver biblioteca completa ->",
    editBatchFreezer: "Editar mantecadora",
    editDisplayCases: "Editar vitrinas",
    cancel: "Cancelar",
    batchFreezerManager: "Gestión de mantecadoras",
    displayCaseManager: "Gestión de vitrinas",
    addBatchFreezer: "+ Añadir mantecadora",
    addDisplayCase: "+ Añadir vitrina",
    close: "Cerrar",
    temperature: "Temperatura",
    style: "Estilo",
    remove: "Eliminar",
    save: "Guardar",
  },
  it: {
    greeting: "Buon Giorno",
    synced: "SINCRONIZZATO",
    activeEquipment: "ATTREZZATURA ATTIVA",
    batchFreezer: "MANTECATORE",
    displayCaseLabel: "VETRINA",
    styleLabel: "STILE",
    recipeBook: "RICETTARIO",
    viewFullLibrary: "Vai alla libreria completa ->",
    editBatchFreezer: "Modifica mantecatore",
    editDisplayCases: "Modifica vetrine",
    cancel: "Annulla",
    batchFreezerManager: "Gestione mantecatori",
    displayCaseManager: "Gestione vetrine",
    addBatchFreezer: "+ Aggiungi mantecatore",
    addDisplayCase: "+ Aggiungi vetrina",
    close: "Chiudi",
    temperature: "Temperatura",
    style: "Stile",
    remove: "Rimuovi",
    save: "Salva",
  },
};

const RECENT_FORMULAS: RecentFormula[] = [
  { id: "pistachio-siciliano", title: "Pistachio Siciliano", archetype: "Classic Crema" },
  { id: "coconut-sorbetto", title: "Coconut Sorbetto", archetype: "Fresh Fruit Sorbet" },
  { id: "dark-chocolate", title: "Dark Chocolate", archetype: "Rich Chocolate/Nut" },
];

const INITIAL_DISPLAY_CASES: DisplayCaseCard[] = [
  {
    id: "front-window",
    name: "Front Window Case",
    total: 24,
    tempC: "-15.0",
    style: "Traditional",
  },
];

type LiquidGlassCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "default" | "equipment";
  equipmentAnimatedStyle?: StyleProp<ViewStyle>;
};

function LiquidGlassCard({
  children,
  style,
  variant = "default",
  equipmentAnimatedStyle,
}: LiquidGlassCardProps) {
  if (variant === "equipment") {
    return (
      <Animated.View style={[equipmentAnimatedStyle, style]}>
        <LinearGradient
          colors={["rgba(0, 198, 255, 0.5)", "rgba(0, 114, 255, 0.5)"]}
          style={styles.equipmentGradientBorder}
        >
          <BlurView intensity={30} tint="dark" style={styles.equipmentGlassCard}>
            {children}
          </BlurView>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.glassBorder, style]}>
      <BlurView intensity={30} tint="dark" style={styles.glassCard}>
        {children}
      </BlurView>
    </View>
  );
}

function archetypeAccent(archetype: string) {
  if (archetype === "Classic Crema") {
    return "#FFAB00";
  }

  if (archetype === "Fresh Fruit Sorbet") {
    return "#00E5FF";
  }

  return "#FF5252";
}

function DigitalThermostat({ value }: { value: string }) {
  const glowOpacity = useSharedValue(0.45);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 0.995 + glowOpacity.value * 0.02 }],
  }));

  return (
    <Reanimated.View style={[styles.tempReadoutBox, animatedStyle]}>
      <Text style={styles.tempReadoutText}>{`${value}\u00B0C`}</Text>
    </Reanimated.View>
  );
}

export function HomeScreen({
  profileName = "Maestro",
  activeEquipmentLabel = "Bravo Trittico 5L",
  recipeCount = 42,
  onViewLibrary,
  onEditBatchFreezer,
  onEditDisplayCases,
}: HomeScreenProps) {
  const { language } = useMobileLanguage();
  const copy = HOME_COPY[language as MobileLanguage] ?? HOME_COPY.en;
  const [batchFreezers, setBatchFreezers] = useState<string[]>([activeEquipmentLabel]);
  const [displayCases, setDisplayCases] = useState<DisplayCaseCard[]>(INITIAL_DISPLAY_CASES);
  const [showBatchFreezerEditor, setShowBatchFreezerEditor] = useState(false);
  const [showDisplayCaseEditor, setShowDisplayCaseEditor] = useState(false);
  const equipmentGlowOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    let active = true;

    void loadEquipmentSettings().then((snapshot) => {
      if (!active) {
        return;
      }

      setBatchFreezers(snapshot.units.map((unit) => `${unit.brand} ${unit.model}`.trim()));
      setDisplayCases(
        snapshot.displayCases.map((displayCase) => ({
          id: displayCase.id,
          name: displayCase.name,
          total: displayCase.capacity_pans,
          tempC: displayCase.target_temp_c.toFixed(1),
          style: displayCase.style,
        }))
      );
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(equipmentGlowOpacity, {
          toValue: 0.8,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(equipmentGlowOpacity, {
          toValue: 0.4,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [equipmentGlowOpacity]);

  const activeBatchFreezer = batchFreezers[0] ?? activeEquipmentLabel;
  const activeDisplayCase = displayCases[0] ?? INITIAL_DISPLAY_CASES[0];

  const greetingText = useMemo(
    () => `${copy.greeting}, ${profileName}!`,
    [copy.greeting, profileName]
  );

  function openBatchFreezerEditor() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onEditBatchFreezer) {
      onEditBatchFreezer();
      return;
    }

    setShowBatchFreezerEditor(true);
  }

  function openDisplayCaseEditor() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onEditDisplayCases) {
      onEditDisplayCases();
      return;
    }

    setShowDisplayCaseEditor(true);
  }

  function handleEquipmentOptions() {
    void Haptics.selectionAsync();
    const options = [copy.editBatchFreezer, copy.editDisplayCases, copy.cancel];

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) {
            openBatchFreezerEditor();
          } else if (index === 1) {
            openDisplayCaseEditor();
          }
        }
      );
      return;
    }

    Alert.alert(copy.activeEquipment, undefined, [
      { text: copy.editBatchFreezer, onPress: openBatchFreezerEditor },
      { text: copy.editDisplayCases, onPress: openDisplayCaseEditor },
      { text: copy.cancel, style: "cancel" },
    ]);
  }

  function updateBatchFreezer(index: number, value: string) {
    setBatchFreezers((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? value : item))
    );
  }

  function addBatchFreezer() {
    void Haptics.selectionAsync();
    setBatchFreezers((current) => [...current, `Batch Freezer ${current.length + 1}`]);
  }

  function removeBatchFreezer(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBatchFreezers((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : [activeEquipmentLabel];
    });
  }

  function updateDisplayCase(index: number, patch: Partial<DisplayCaseCard>) {
    setDisplayCases((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function addDisplayCase() {
    void Haptics.selectionAsync();
    setDisplayCases((current) => [
      ...current,
      {
        id: `display-case-${current.length + 1}`,
        name: `Display Case ${current.length + 1}`,
        total: 12,
        tempC: "-11.5",
        style: "Traditional",
      },
    ]);
  }

  function removeDisplayCase(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDisplayCases((current) => {
      const next = current.filter((_, itemIndex) => itemIndex !== index);
      return next.length > 0 ? next : INITIAL_DISPLAY_CASES;
    });
  }

  function handleOpenFormula() {
    void Haptics.selectionAsync();
    onViewLibrary?.();
  }

  return (
    <LinearGradient colors={["#0A0B14", "#000000"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>{greetingText}</Text>

            <View style={styles.headerRight}>
              <View style={styles.syncPill}>
                <View style={styles.syncDot} />
                <Text style={styles.syncText}>{copy.synced}</Text>
              </View>
              <LanguageToggle />
            </View>
          </View>

          <LiquidGlassCard
            style={styles.heroShell}
            variant="equipment"
            equipmentAnimatedStyle={{ opacity: equipmentGlowOpacity }}
          >
            <View style={styles.equipmentCard}>
              <View style={styles.equipmentHeader}>
                <View style={styles.equipmentHeaderSpacer} />
                <Text style={styles.equipmentHeaderLabel}>{copy.activeEquipment}</Text>
                <Pressable onPress={handleEquipmentOptions} style={styles.equipmentMoreButton}>
                  <MaterialCommunityIcons name="dots-horizontal" size={18} color="#FFFFFF" />
                </Pressable>
              </View>

              <View style={styles.hardwareGrid}>
                <View style={styles.hardwareBlockSingle}>
                  <Text style={styles.hardwareLabel}>{copy.batchFreezer}</Text>
                  <Text style={styles.hardwareValue}>{activeBatchFreezer}</Text>
                </View>
              </View>

              <View style={styles.caseList}>
                <View style={styles.casePillRow}>
                  <View style={styles.caseHeaderRow}>
                    <Text style={styles.casePillLabel}>{`${copy.displayCaseLabel} #1`}</Text>
                    <View style={styles.styleBadge}>
                      <Text style={styles.styleBadgeText}>
                        {activeDisplayCase.style}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.casePillValue}>
                    {`${activeDisplayCase.name} (${activeDisplayCase.total} Pans)`}
                  </Text>
                  <DigitalThermostat value={activeDisplayCase.tempC} />
                </View>
              </View>
            </View>
          </LiquidGlassCard>

          <View style={styles.recipeBookHeader}>
            <Text style={styles.sectionLabel}>{copy.recipeBook}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{recipeCount}</Text>
            </View>
          </View>
          <LiquidGlassCard>
            <View style={styles.formulasCard}>
              {RECENT_FORMULAS.map((formula, index) => (
                <Pressable
                  key={formula.id}
                  onPress={handleOpenFormula}
                  style={[
                    styles.formulaPill,
                    index === RECENT_FORMULAS.length - 1 && styles.formulaPillLast,
                  ]}
                >
                  <View style={styles.formulaRow}>
                    <View style={styles.formulaCopy}>
                      <Text style={styles.formulaTitle}>{formula.title}</Text>
                      <View style={styles.formulaMetaRow}>
                        <View
                          style={[
                            styles.formulaAccentDot,
                            { backgroundColor: archetypeAccent(formula.archetype) },
                          ]}
                        />
                        <Text style={styles.formulaMeta}>{formula.archetype}</Text>
                      </View>
                    </View>
                    <Text style={styles.formulaChevron}>&gt;</Text>
                  </View>
                </Pressable>
              ))}

              <Pressable onPress={onViewLibrary} style={styles.viewLibraryButton}>
                <Text style={styles.viewLibraryText}>{copy.viewFullLibrary}</Text>
              </Pressable>
            </View>
          </LiquidGlassCard>
        </ScrollView>
      </SafeAreaView>

      <Modal
        transparent
        animationType="slide"
        visible={showBatchFreezerEditor}
        onRequestClose={() => setShowBatchFreezerEditor(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowBatchFreezerEditor(false)}
          />
          <View style={styles.modalCardShell}>
            <BlurView intensity={24} tint="dark" style={styles.modalCard}>
              <Text style={styles.modalLabel}>{copy.batchFreezerManager}</Text>
              {batchFreezers.map((freezer, index) => (
                <View key={`${freezer}-${index}`} style={styles.editorRow}>
                  <TextInput
                    value={freezer}
                    onChangeText={(value) => updateBatchFreezer(index, value)}
                    placeholder="Bravo Trittico"
                    placeholderTextColor="#707070"
                    style={styles.editorInput}
                  />
                  <Pressable onPress={() => removeBatchFreezer(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>{copy.remove}</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={addBatchFreezer} style={styles.addButton}>
                <Text style={styles.addButtonText}>{copy.addBatchFreezer}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowBatchFreezerEditor(false);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{copy.save}</Text>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="slide"
        visible={showDisplayCaseEditor}
        onRequestClose={() => setShowDisplayCaseEditor(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setShowDisplayCaseEditor(false)}
          />
          <View style={styles.modalCardShell}>
            <BlurView intensity={24} tint="dark" style={styles.modalCard}>
              <Text style={styles.modalLabel}>{copy.displayCaseManager}</Text>
              <ScrollView style={styles.editorScroll} contentContainerStyle={styles.editorScrollContent}>
                {displayCases.map((displayCase, index) => (
                  <View key={displayCase.id} style={styles.caseEditorCard}>
                    <TextInput
                      value={displayCase.name}
                      onChangeText={(value) => updateDisplayCase(index, { name: value })}
                      placeholder="Front Window Case"
                      placeholderTextColor="#707070"
                      style={styles.editorInput}
                    />
                    <View style={styles.editorGrid}>
                      <TextInput
                        value={String(displayCase.total)}
                        onChangeText={(value) =>
                          updateDisplayCase(index, { total: Number(value.replace(/[^0-9]/g, "")) || 0 })
                        }
                        placeholder="24"
                        placeholderTextColor="#707070"
                        keyboardType="number-pad"
                        style={[styles.editorInput, styles.editorInputHalf]}
                      />
                      <TextInput
                        value={displayCase.tempC}
                        onChangeText={(value) => updateDisplayCase(index, { tempC: value })}
                        placeholder="-15.0"
                        placeholderTextColor="#707070"
                        keyboardType="decimal-pad"
                        style={[styles.editorInput, styles.editorInputHalf]}
                      />
                    </View>
                    <TextInput
                      value={displayCase.style}
                      onChangeText={(value) => updateDisplayCase(index, { style: value })}
                      placeholder="Traditional"
                      placeholderTextColor="#707070"
                      style={styles.editorInput}
                    />
                    <Pressable onPress={() => removeDisplayCase(index)} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>{copy.remove}</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
              <Pressable onPress={addDisplayCase} style={styles.addButton}>
                <Text style={styles.addButtonText}>{copy.addDisplayCase}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  setShowDisplayCaseEditor(false);
                }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{copy.save}</Text>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 132,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 30,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  greeting: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 24,
    lineHeight: 32,
    fontFamily: theme.typography.sans,
  },
  syncPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00E676",
  },
  syncText: {
    color: "#00E676",
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: theme.typography.mono,
  },
  glassBorder: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  glassCard: {
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "transparent",
  },
  equipmentGradientBorder: {
    padding: 2.5,
    borderRadius: 24,
  },
  equipmentGlassCard: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(10, 10, 15, 0.8)",
  },
  heroShell: {
    marginBottom: 34,
  },
  equipmentCard: {
    padding: 20,
    gap: 20,
  },
  equipmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  equipmentHeaderSpacer: {
    width: 24,
  },
  equipmentHeaderLabel: {
    flex: 1,
    textAlign: "center",
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: theme.typography.mono,
  },
  equipmentMoreButton: {
    width: 24,
    alignItems: "flex-end",
  },
  hardwareGrid: {
    gap: 16,
  },
  hardwareBlockSingle: {
    gap: 8,
    paddingTop: 4,
  },
  hardwareLabel: {
    color: "#A3A3A3",
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  hardwareValue: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
  },
  caseList: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 8,
  },
  casePillRow: {
    paddingVertical: 12,
    gap: 10,
  },
  caseHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  casePillLabel: {
    color: "#A3A3A3",
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  styleBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0, 229, 255, 0.3)",
    backgroundColor: "rgba(0, 229, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  styleBadgeText: {
    color: "#C8FBFF",
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: theme.typography.mono,
  },
  casePillValue: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
  },
  tempReadoutBox: {
    alignSelf: "flex-start",
    backgroundColor: "#000000",
    borderWidth: 1,
    borderColor: "#111111",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tempReadoutText: {
    color: "#FF073A",
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Courier",
    textShadowColor: "rgba(255, 7, 58, 0.6)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  sectionLabel: {
    color: "#707070",
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: theme.typography.mono,
  },
  recipeBookHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 34,
  },
  countBadge: {
    minWidth: 32,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "#A3A3A3",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  formulasCard: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 22,
  },
  formulaPill: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 10,
  },
  formulaPillLast: {
    marginBottom: 0,
  },
  formulaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  formulaCopy: {
    flex: 1,
    gap: 4,
    paddingRight: 14,
  },
  formulaTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 24,
    fontFamily: theme.typography.sans,
  },
  formulaMeta: {
    color: "#A3A3A3",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.typography.mono,
  },
  formulaMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formulaAccentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  formulaChevron: {
    color: "#404040",
    fontSize: 18,
    fontFamily: theme.typography.mono,
  },
  viewLibraryButton: {
    alignItems: "center",
    paddingTop: 16,
  },
  viewLibraryText: {
    color: "#E5E5E5",
    opacity: 0.8,
    fontSize: 14,
    fontWeight: "500",
    textShadowColor: "rgba(255, 255, 255, 0.18)",
    textShadowRadius: 4,
    fontFamily: theme.typography.sans,
  },
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalCardShell: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    overflow: "hidden",
  },
  modalCard: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    gap: 14,
    backgroundColor: "rgba(10, 10, 15, 0.82)",
    maxHeight: "78%",
  },
  modalLabel: {
    color: "#D4AF37",
    fontSize: 11,
    letterSpacing: 2,
    fontFamily: theme.typography.mono,
  },
  editorRow: {
    gap: 10,
  },
  editorInput: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.sans,
  },
  editorGrid: {
    flexDirection: "row",
    gap: 10,
  },
  editorInputHalf: {
    flex: 1,
  },
  editorScroll: {
    maxHeight: 320,
  },
  editorScrollContent: {
    gap: 14,
  },
  caseEditorCard: {
    gap: 10,
    borderRadius: 18,
    padding: 14,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  addButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  addButtonText: {
    color: "#E5E5E5",
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  removeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.28)",
    backgroundColor: "rgba(255, 82, 82, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: "#FF8E8E",
    fontSize: 11,
    fontFamily: theme.typography.mono,
  },
  primaryButton: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: "#000000",
    fontSize: 12,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
});


