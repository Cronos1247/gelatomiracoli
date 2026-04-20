import { useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { GlassCard, GlassWrapper } from "../components/shared";
import {
  loadEquipmentSettings,
  saveEquipmentSettings,
  type DisplayCaseRecord,
  type EquipmentUnitRecord,
} from "../lib/equipmentSettings";
import { theme } from "../theme";

type EquipmentSettingsScreenProps = {
  onBack: () => void;
  onSaved?: () => void;
};

function formatUnitLabel(unit: EquipmentUnitRecord) {
  return `${unit.brand} ${unit.model}`.trim();
}

export function EquipmentSettingsScreen({
  onBack,
  onSaved,
}: EquipmentSettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<EquipmentUnitRecord[]>([]);
  const [displayCases, setDisplayCases] = useState<DisplayCaseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void loadEquipmentSettings()
      .then((snapshot) => {
        if (!active) {
          return;
        }

        setUnits(snapshot.units);
        setDisplayCases(snapshot.displayCases);
        setLoading(false);
      })
      .catch((nextError) => {
        if (!active) {
          return;
        }

        setError(nextError instanceof Error ? nextError.message : "Unable to load hardware.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const canAddMore = useMemo(() => units.length + displayCases.length < 8, [displayCases.length, units.length]);

  function updateUnit(index: number, patch: Partial<EquipmentUnitRecord>) {
    setUnits((current) =>
      current.map((unit, unitIndex) => (unitIndex === index ? { ...unit, ...patch } : unit))
    );
  }

  function updateDisplayCase(index: number, patch: Partial<DisplayCaseRecord>) {
    setDisplayCases((current) =>
      current.map((displayCase, displayIndex) =>
        displayIndex === index ? { ...displayCase, ...patch } : displayCase
      )
    );
  }

  function addNewUnit() {
    void Haptics.selectionAsync();

    if (units.length <= displayCases.length) {
      setUnits((current) => [
        ...current,
        {
          id: `draft-unit-${Date.now()}`,
          brand: "Custom",
          model: `Batch Freezer ${current.length + 1}`,
          min_batch_l: 1,
          max_batch_l: 5,
        },
      ]);
      return;
    }

    setDisplayCases((current) => [
      ...current,
      {
        id: `draft-case-${Date.now()}`,
        name: `Display Case ${current.length + 1}`,
        capacity_pans: 12,
        target_temp_c: -11.5,
        pac_range_min: 0,
        pac_range_max: 279,
        display_order: current.length,
        style: "Traditional",
      },
    ]);
  }

  function removeUnit(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUnits((current) => current.filter((_, unitIndex) => unitIndex !== index));
  }

  function removeDisplayCase(index: number) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDisplayCases((current) => current.filter((_, caseIndex) => caseIndex !== index));
  }

  async function handleSaveEquipment() {
    setSaving(true);
    setError(null);

    try {
      await saveEquipmentSettings({ units, displayCases });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSaved?.();
      onBack();
    } catch (nextError) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(nextError instanceof Error ? nextError.message : "Unable to save hardware.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassWrapper>
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.title}>HARDWARE & HARDWARE</Text>
          <Pressable onPress={() => void handleSaveEquipment()} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>{saving ? "..." : "SAVE"}</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {error ? (
              <GlassCard contentStyle={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </GlassCard>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>PRODUCTION UNITS</Text>
              {units.map((unit, index) => (
                <GlassCard key={unit.id} contentStyle={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{formatUnitLabel(unit)}</Text>
                    <Pressable onPress={() => removeUnit(index)} style={styles.removeButton}>
                      <Text style={styles.removeButtonText}>REMOVE</Text>
                    </Pressable>
                  </View>

                  <View style={styles.editorGrid}>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>MIN BATCH (L)</Text>
                      <TextInput
                        value={unit.min_batch_l.toString()}
                        onChangeText={(value) =>
                          updateUnit(index, { min_batch_l: Number(value.replace(/[^0-9.]/g, "")) || 0 })
                        }
                        keyboardType="decimal-pad"
                        style={styles.digitalInput}
                      />
                    </View>

                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>MAX BATCH (L)</Text>
                      <TextInput
                        value={unit.max_batch_l.toString()}
                        onChangeText={(value) =>
                          updateUnit(index, { max_batch_l: Number(value.replace(/[^0-9.]/g, "")) || 0 })
                        }
                        keyboardType="decimal-pad"
                        style={styles.digitalInput}
                      />
                    </View>
                  </View>
                </GlassCard>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>DISPLAY CASES</Text>
              {displayCases.map((displayCase, index) => (
                <GlassCard key={displayCase.id} contentStyle={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <TextInput
                      value={displayCase.name}
                      onChangeText={(value) => updateDisplayCase(index, { name: value })}
                      style={styles.caseNameInput}
                      placeholder="Front Case"
                      placeholderTextColor="#707070"
                    />
                    <View style={styles.styleToggle}>
                      {(["Traditional", "Pozzetti"] as const).map((option) => (
                        <Pressable
                          key={option}
                          onPress={() => updateDisplayCase(index, { style: option })}
                          style={[
                            styles.styleToggleOption,
                            displayCase.style === option && styles.styleToggleOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.styleToggleText,
                              displayCase.style === option && styles.styleToggleTextActive,
                            ]}
                          >
                            {option}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={styles.fieldLabel}>SORTING INTELLIGENCE</Text>
                    <View style={styles.editorGrid}>
                      <TextInput
                        value={displayCase.pac_range_min.toString()}
                        onChangeText={(value) =>
                          updateDisplayCase(index, {
                            pac_range_min: Number(value.replace(/[^0-9.-]/g, "")) || 0,
                          })
                        }
                        keyboardType="decimal-pad"
                        style={styles.digitalInput}
                      />
                      <TextInput
                        value={displayCase.pac_range_max.toString()}
                        onChangeText={(value) =>
                          updateDisplayCase(index, {
                            pac_range_max: Number(value.replace(/[^0-9.-]/g, "")) || 0,
                          })
                        }
                        keyboardType="decimal-pad"
                        style={styles.digitalInput}
                      />
                    </View>
                  </View>

                  <View style={styles.editorGrid}>
                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>TARGET OPERATING TEMP (C)</Text>
                      <TextInput
                        value={displayCase.target_temp_c.toString()}
                        onChangeText={(value) =>
                          updateDisplayCase(index, {
                            target_temp_c: Number(value.replace(/[^0-9.-]/g, "")) || 0,
                          })
                        }
                        keyboardType="decimal-pad"
                        style={styles.digitalInput}
                      />
                    </View>

                    <View style={styles.fieldBlock}>
                      <Text style={styles.fieldLabel}>CAPACITY PANS</Text>
                      <TextInput
                        value={displayCase.capacity_pans.toString()}
                        onChangeText={(value) =>
                          updateDisplayCase(index, {
                            capacity_pans: Number(value.replace(/[^0-9]/g, "")) || 0,
                          })
                        }
                        keyboardType="number-pad"
                        style={styles.digitalInput}
                      />
                    </View>
                  </View>

                  <Pressable onPress={() => removeDisplayCase(index)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>REMOVE CASE</Text>
                  </Pressable>
                </GlassCard>
              ))}
            </View>
          </ScrollView>
        )}

        {canAddMore ? (
          <Pressable onPress={addNewUnit} style={styles.floatingAddPill}>
            <Text style={styles.floatingAddText}>+ ADD NEW UNIT</Text>
          </Pressable>
        ) : null}
      </View>
    </GlassWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
  },
  saveButton: {
    minWidth: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 24,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    color: "#D4AF37",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    fontFamily: theme.typography.mono,
  },
  cardContent: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 14,
    backgroundColor: "rgba(10, 10, 15, 0.45)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
  },
  fieldBlock: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    color: "#A3A3A3",
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  editorGrid: {
    flexDirection: "row",
    gap: 12,
  },
  digitalInput: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#1A1A1A",
    backgroundColor: "#050505",
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FF073A",
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Courier",
    textShadowColor: "rgba(255, 7, 58, 0.6)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  caseNameInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
    fontFamily: theme.typography.sans,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  styleToggle: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  styleToggleOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  styleToggleOptionActive: {
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  styleToggleText: {
    color: "#A3A3A3",
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: theme.typography.mono,
  },
  styleToggleTextActive: {
    color: "#FFFFFF",
  },
  removeButton: {
    alignSelf: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 82, 82, 0.3)",
    backgroundColor: "rgba(255, 82, 82, 0.08)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  removeButtonText: {
    color: "#FF8E8E",
    fontSize: 11,
    letterSpacing: 1.1,
    fontFamily: theme.typography.mono,
  },
  errorCard: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(58, 13, 13, 0.5)",
  },
  errorText: {
    color: "#FFB4B4",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.typography.mono,
  },
  floatingAddPill: {
    alignSelf: "center",
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  floatingAddText: {
    color: "#E5E5E5",
    fontSize: 12,
    letterSpacing: 1.3,
    fontFamily: theme.typography.mono,
  },
});
