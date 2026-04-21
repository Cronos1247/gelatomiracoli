import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { LanguageToggle } from "../components/LanguageToggle";
import { useMobileLanguage } from "../i18n/LanguageProvider";
import { mobileSupabase } from "../lib/supabase";
import { normalizeIngredient } from "../lib/pantry";
import { theme } from "../theme";
import type { MobileIngredient } from "../types";

type PantryCategory = "All" | "Sugars" | "Structure" | "Dairy" | "Fresh Fruit" | "Flavors";

const CATEGORY_CHIPS: PantryCategory[] = [
  "All",
  "Sugars",
  "Structure",
  "Dairy",
  "Fresh Fruit",
  "Flavors",
];

const PANTRY_COPY = {
  en: {
    title: "PANTRY",
    searchPlaceholder: "Search ingredients...",
    emptyTitle: "No ingredients found.",
    emptyCopy: "Try another search or category filter.",
    categories: {
      All: "All",
      Sugars: "Sugars",
      Structure: "Structure",
      Dairy: "Dairy",
      "Fresh Fruit": "Fresh Fruit",
      Flavors: "Flavors",
    } as Record<PantryCategory, string>,
  },
  es: {
    title: "DESPENSA",
    searchPlaceholder: "Buscar ingredientes...",
    emptyTitle: "No se encontraron ingredientes.",
    emptyCopy: "Prueba otra busqueda o filtro de categoria.",
    categories: {
      All: "Todo",
      Sugars: "Azucares",
      Structure: "Estructura",
      Dairy: "Lacteos",
      "Fresh Fruit": "Fruta Fresca",
      Flavors: "Sabores",
    } as Record<PantryCategory, string>,
  },
  it: {
    title: "DISPENSA",
    searchPlaceholder: "Cerca ingredienti...",
    emptyTitle: "Nessun ingrediente trovato.",
    emptyCopy: "Prova un'altra ricerca o filtro categoria.",
    categories: {
      All: "Tutto",
      Sugars: "Zuccheri",
      Structure: "Struttura",
      Dairy: "Latticini",
      "Fresh Fruit": "Frutta Fresca",
      Flavors: "Sapori",
    } as Record<PantryCategory, string>,
  },
} as const;

function normalizeCategory(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function matchesCategoryChip(category: string | null | undefined, chip: PantryCategory) {
  const normalized = normalizeCategory(category);

  if (chip === "All") {
    return true;
  }

  if (chip === "Sugars") {
    return normalized.includes("sugar");
  }

  if (chip === "Structure") {
    return normalized.includes("base") || normalized.includes("stabilizer") || normalized.includes("structure");
  }

  if (chip === "Dairy") {
    return normalized.includes("dairy") || normalized.includes("milk") || normalized.includes("cream");
  }

  if (chip === "Fresh Fruit") {
    return normalized.includes("fresh fruit") || normalized.includes("fruit");
  }

  if (chip === "Flavors") {
    return normalized.includes("flavor") || normalized.includes("paste");
  }

  return false;
}

export function PantryScreen({ titleOverride }: { titleOverride?: string }) {
  const { language } = useMobileLanguage();
  const copy = PANTRY_COPY[language];
  const [ingredients, setIngredients] = useState<MobileIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<PantryCategory>("All");

  useEffect(() => {
    let active = true;

    const loadIngredients = async () => {
      if (!mobileSupabase) {
        if (active) {
          setIngredients([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      const { data, error } = await mobileSupabase
        .from("ingredients")
        .select("*")
        .order("category", { ascending: true })
        .order("name", { ascending: true });

      if (!active) {
        return;
      }

      if (error || !data) {
        setIngredients([]);
        setLoading(false);
        return;
      }

      setIngredients(data.map((item) => normalizeIngredient(item as Record<string, unknown>)));
      setLoading(false);
    };

    void loadIngredients();

    return () => {
      active = false;
    };
  }, []);

  const filteredIngredients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return ingredients.filter((ingredient) => {
      const matchesCategory = matchesCategoryChip(ingredient.category, activeCategory);

      if (!matchesCategory) {
        return false;
      }

      if (!query) {
        return true;
      }

      const haystack = [
        ingredient.name,
        ingredient.name_en,
        ingredient.name_es,
        ingredient.name_it,
        ingredient.category,
        ingredient.brand_name,
        ingredient.product_code,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [activeCategory, ingredients, searchQuery]);

  return (
    <LinearGradient colors={["#0A0B10", "#000000"]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={filteredIngredients}
          keyExtractor={(item) => item.id ?? `${item.category}-${item.name}`}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View style={styles.header}>
              <View style={styles.headerRow}>
                <Text style={styles.title}>{titleOverride ?? copy.title}</Text>
                <LanguageToggle />
              </View>

              <View style={styles.searchShell}>
                <BlurView intensity={20} tint="dark" style={styles.searchBlur}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#707070" />
                  <TextInput
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder={copy.searchPlaceholder}
                    placeholderTextColor="#707070"
                    style={styles.searchInput}
                  />
                </BlurView>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {CATEGORY_CHIPS.map((chip) => {
                  const active = activeCategory === chip;

                  return (
                    <Pressable
                      key={chip}
                      onPress={() => setActiveCategory(chip)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {copy.categories[chip]}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color="#FFFFFF" />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>{copy.emptyTitle}</Text>
                <Text style={styles.emptyCopy}>{copy.emptyCopy}</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                <Text style={styles.ingredientCategory}>{item.category ?? "Ingredient"}</Text>
              </View>

              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>PAC</Text>
                  <Text style={[styles.telemetryValue, styles.telemetryPac]}>
                    {Number(item.pac_value ?? 0).toFixed(0)}
                  </Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>POD</Text>
                  <Text style={styles.telemetryValue}>{Number(item.pod_value ?? 0).toFixed(1)}</Text>
                </View>
                <View style={styles.telemetryItem}>
                  <Text style={styles.telemetryLabel}>SOL</Text>
                  <Text style={[styles.telemetryValue, styles.telemetrySolids]}>
                    {Number(item.total_solids_pct ?? 0).toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 18,
  },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: theme.typography.serif,
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
    backgroundColor: "rgba(18, 18, 18, 0.2)",
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.sans,
    paddingVertical: 0,
  },
  chipsRow: {
    paddingTop: 14,
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  chipActive: {
    borderColor: "rgba(255, 255, 255, 0.28)",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  chipText: {
    color: "#A3A3A3",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  rowLeft: {
    flex: 1,
    gap: 4,
    paddingRight: 10,
  },
  ingredientName: {
    color: "#FFFFFF",
    fontSize: 16,
    lineHeight: 22,
    fontFamily: theme.typography.sans,
  },
  ingredientCategory: {
    color: "#A3A3A3",
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.typography.sans,
  },
  telemetryGrid: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  telemetryItem: {
    minWidth: 48,
    alignItems: "flex-end",
    gap: 2,
  },
  telemetryLabel: {
    color: "#707070",
    fontSize: 10,
    letterSpacing: 0.8,
    fontFamily: theme.typography.mono,
  },
  telemetryValue: {
    color: "#DADADA",
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  telemetryPac: {
    color: "#8ACBFF",
  },
  telemetrySolids: {
    color: "#D9C88A",
  },
  emptyState: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: theme.typography.sans,
  },
  emptyCopy: {
    color: "#A3A3A3",
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
});
