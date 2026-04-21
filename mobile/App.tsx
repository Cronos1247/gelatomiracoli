import "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BlurView } from "expo-blur";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { usePantry } from "./src/hooks/usePantry";
import { useRecipes } from "./src/hooks/useRecipes";
import "./src/i18n";
import { MobileLanguageProvider, useMobileLanguage } from "./src/i18n/LanguageProvider";
import { inferIngredientFlavor, savePantryIngredient } from "./src/lib/pantry";
import { EquipmentSettingsScreen } from "./src/screens/EquipmentSettingsScreen";
import { MatrixScreen } from "./src/screens/MatrixScreen";
import { PantryScreen } from "./src/screens/PantryScreen";
import { RecipeLabScreen } from "./src/screens/RecipeLabScreen";
import { ScannerScreen } from "./src/screens/ScannerScreen";
import { SettingsDetailScreen } from "./src/screens/SettingsDetailScreen";
import { theme } from "./src/theme";
import type { MobileIngredient } from "./src/types";

type AppSection =
  | "lab"
  | "matrix"
  | "scanner"
  | "ledger"
  | "equipment-settings"
  | "account-settings"
  | "preferences-settings";

const MOBILE_CUSTOM_PANTRY_KEY = "gelatomiracoli.mobile.custom-pantry";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <MobileLanguageProvider>
          <AppShell />
        </MobileLanguageProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppShell() {
  const { isHydrated: isLanguageHydrated } = useMobileLanguage();
  const insets = useSafeAreaInsets();
  const { loading, ingredients, refresh } = usePantry();
  const { refresh: refreshRecipes } = useRecipes();
  const [customIngredients, setCustomIngredients] = useState<MobileIngredient[]>([]);
  const [activeSection, setActiveSection] = useState<AppSection>("lab");

  useEffect(() => {
    void AsyncStorage.getItem(MOBILE_CUSTOM_PANTRY_KEY).then((storedValue) => {
      if (!storedValue) {
        return;
      }

      try {
        const parsed = JSON.parse(storedValue) as MobileIngredient[];
        setCustomIngredients(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCustomIngredients([]);
      }
    });
  }, []);

  useEffect(() => {
    void AsyncStorage.setItem(MOBILE_CUSTOM_PANTRY_KEY, JSON.stringify(customIngredients));
  }, [customIngredients]);

  const sessionIngredients = useMemo(() => {
    const seen = new Set<string>();

    return [...customIngredients, ...ingredients]
      .filter((ingredient) => {
        const key = ingredient.id ?? ingredient.name;

        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .map((ingredient) => ({
        ...ingredient,
        is_flavor: inferIngredientFlavor(ingredient as Record<string, unknown>),
      }));
  }, [customIngredients, ingredients]);

  async function handleQuickAddIngredient(ingredient: MobileIngredient) {
    try {
      await savePantryIngredient(ingredient);
      await refresh();
      return;
    } catch {
      setCustomIngredients((current) => {
        const next = [ingredient, ...current];
        const seen = new Set<string>();

        return next.filter((item) => {
          const key = item.id ?? item.name;

          if (seen.has(key)) {
            return false;
          }

          seen.add(key);
          return true;
        });
      });
    }
  }

  const currentScreen = !isLanguageHydrated ? (
    <View style={styles.centered}>
      <ActivityIndicator color="#FFFFFF" />
    </View>
  ) : activeSection === "lab" ? (
    <LabScreen
      ingredients={sessionIngredients}
      loading={loading}
      onQuickAddIngredient={handleQuickAddIngredient}
      onRecipeSaved={refreshRecipes}
    />
  ) : activeSection === "matrix" ? (
    <MatrixScreen onOpenHardware={() => setActiveSection("equipment-settings")} />
  ) : activeSection === "scanner" ? (
    <ScannerScreen />
  ) : activeSection === "ledger" ? (
    <PantryScreen titleOverride="LEDGER" />
  ) : activeSection === "equipment-settings" ? (
    <EquipmentSettingsScreen
      onBack={() => setActiveSection("matrix")}
      onSaved={() => setActiveSection("matrix")}
    />
  ) : (
    <SettingsDetailScreen
      title="SETTINGS"
      description="Additional command controls will live here."
      onBack={() => setActiveSection("matrix")}
    />
  );

  const showManualTabBar =
    activeSection === "lab" ||
    activeSection === "matrix" ||
    activeSection === "scanner" ||
    activeSection === "ledger";

  return (
    <>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.appShell}>
          <View style={styles.scene}>{currentScreen}</View>
          {isLanguageHydrated && showManualTabBar ? (
            <ManualTabBar
              activeSection={activeSection}
              bottomInset={insets.bottom}
              onSelect={setActiveSection}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function LabScreen({
  ingredients,
  loading,
  onQuickAddIngredient,
  onRecipeSaved,
}: {
  ingredients: MobileIngredient[];
  loading: boolean;
  onQuickAddIngredient: (ingredient: MobileIngredient) => Promise<void>;
  onRecipeSaved: () => Promise<void>;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.scene, { paddingTop: insets.top }]}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      ) : (
        <RecipeLabScreen
          ingredients={ingredients}
          onQuickAddIngredient={(ingredient) => void onQuickAddIngredient(ingredient)}
          onRecipeSaved={onRecipeSaved}
        />
      )}
    </View>
  );
}

function PlaceholderScreen({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.placeholderScreen, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubtitle}>{subtitle}</Text>
    </View>
  );
}

function ManualTabBar({
  activeSection,
  bottomInset,
  onSelect,
}: {
  activeSection: AppSection;
  bottomInset: number;
  onSelect: (section: AppSection) => void;
}) {
  const tabs: Array<{
    key: AppSection;
    label: string;
    icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  }> = [
    { key: "lab", label: "Lab", icon: "flask-outline" },
    { key: "matrix", label: "Matrix", icon: "view-carousel-outline" },
    { key: "scanner", label: "Scanner", icon: "line-scan" },
    { key: "ledger", label: "Ledger", icon: "database-outline" },
  ];

  return (
    <View style={[styles.manualTabBarFrame, { bottom: Math.max(bottomInset, 12) }]}>
      <BlurView tint="dark" intensity={80} style={StyleSheet.absoluteFillObject} />
      <View style={styles.manualTabBar}>
        {tabs.map((tab) => {
          const focused = activeSection === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                void Haptics.selectionAsync();
                onSelect(tab.key);
              }}
              style={[styles.manualTabButton, focused && styles.manualTabButtonActive]}
            >
              <MaterialCommunityIcons
                name={tab.icon}
                size={tab.key === "lab" ? 24 : 22}
                color={focused ? "#FFFFFF" : "#707070"}
              />
              <Text style={[styles.manualTabLabel, focused && styles.manualTabLabelActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  flex: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  appShell: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scene: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  manualTabBarFrame: {
    position: "absolute",
    left: 16,
    right: 16,
    height: 90,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    backgroundColor: "transparent",
    elevation: 0,
  },
  manualTabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    borderTopWidth: 0,
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 12,
    height: 90,
  },
  manualTabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 6,
  },
  manualTabButtonActive: {
    opacity: 1,
  },
  manualTabLabel: {
    color: "#707070",
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: theme.typography.mono,
  },
  manualTabLabelActive: {
    color: "#FFFFFF",
  },
  placeholderScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    backgroundColor: theme.colors.background,
  },
  placeholderTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontFamily: theme.typography.sans,
  },
  placeholderSubtitle: {
    marginTop: 10,
    color: "#707070",
    fontSize: 12,
    textAlign: "center",
    fontFamily: theme.typography.mono,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
