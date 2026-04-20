import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { theme } from "../theme";
import type { MobileSavedRecipe, RecipeLoadResult } from "../types";

type RecipeBookScreenProps = {
  loading: boolean;
  error: string | null;
  source: RecipeLoadResult["source"];
  recipes: MobileSavedRecipe[];
  onRefresh: () => void;
  onEnterLab: () => void;
};

function formatTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} · ${date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatWeight(grams: number) {
  return `${(grams / 1000).toFixed(2)} kg`;
}

export function RecipeBookScreen({
  loading,
  error,
  source,
  recipes,
  onRefresh,
  onEnterLab,
}: RecipeBookScreenProps) {
  const { t } = useTranslation();

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{t("dashboardLibrary").toUpperCase()}</Text>
          <Text style={styles.title}>{recipes.length} synced recipes</Text>
          <Text style={styles.meta}>Source: {source.toUpperCase()}</Text>
        </View>
        <Pressable onPress={onRefresh} style={styles.refreshButton}>
          <Text style={styles.refreshButtonText}>{loading ? "SYNCING" : "REFRESH"}</Text>
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Recipe sync is offline</Text>
          <Text style={styles.errorCopy}>{error}</Text>
        </View>
      ) : null}

      {!loading && recipes.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No synced recipes yet</Text>
          <Text style={styles.emptyCopy}>
            Save a recipe from the web workbench and it will appear here on refresh.
          </Text>
          <Pressable onPress={onEnterLab} style={styles.enterLabButton}>
            <Text style={styles.enterLabButtonText}>{t("enterLab").toUpperCase()}</Text>
          </Pressable>
        </View>
      ) : null}

      {recipes.map((recipe) => (
        <View key={recipe.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardCopy}>
              <Text style={styles.recipeName}>{recipe.name}</Text>
              <Text style={styles.recipeMeta}>{formatTimestamp(recipe.created_at)}</Text>
            </View>
            <Text style={styles.recipeWeight}>{formatWeight(recipe.total_weight_grams)}</Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>INGREDIENTS</Text>
              <Text style={styles.statValue}>{recipe.items.length}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>PROFILE</Text>
              <Text style={styles.statValue}>{recipe.is_sorbet ? "SORBET" : "GELATO"}</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>EQUIPMENT</Text>
              <Text style={styles.statValue}>{recipe.equipment_id ?? "Default"}</Text>
            </View>
          </View>

          <View style={styles.ingredientList}>
            {recipe.items.slice(0, 4).map((item) => (
              <View key={`${recipe.id}-${item.ingredient_name}`} style={styles.ingredientRow}>
                <Text style={styles.ingredientName}>{item.ingredient_name}</Text>
                <Text style={styles.ingredientGrams}>{Math.round(item.grams)} g</Text>
              </View>
            ))}
            {recipe.items.length > 4 ? (
              <Text style={styles.moreItems}>+{recipe.items.length - 4} more ingredients</Text>
            ) : null}
          </View>
        </View>
      ))}
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
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  kicker: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.4,
    fontFamily: theme.typography.mono,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: theme.typography.mono,
  },
  meta: {
    color: "#9A9A9A",
    fontSize: 11,
    letterSpacing: 1,
    fontFamily: theme.typography.mono,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "transparent",
  },
  refreshButtonText: {
    color: theme.colors.text,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: "#4A1F1F",
    backgroundColor: "#170B0B",
    padding: 16,
    gap: 6,
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: 13,
    fontFamily: theme.typography.mono,
  },
  errorCopy: {
    color: "#C28D8D",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: theme.typography.mono,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 10,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.typography.mono,
  },
  emptyCopy: {
    color: "#B5B5B5",
    fontSize: 12,
    lineHeight: 18,
    fontFamily: theme.typography.mono,
  },
  enterLabButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  enterLabButtonText: {
    color: theme.colors.text,
    fontSize: 11,
    letterSpacing: 1.2,
    fontFamily: theme.typography.mono,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
    gap: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  recipeName: {
    color: theme.colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: theme.typography.mono,
  },
  recipeMeta: {
    color: "#9D9D9D",
    fontSize: 11,
    lineHeight: 16,
    fontFamily: theme.typography.mono,
  },
  recipeWeight: {
    color: theme.colors.accent,
    fontSize: 13,
    fontFamily: theme.typography.mono,
  },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBlock: {
    minWidth: 92,
    gap: 4,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.1,
    fontFamily: theme.typography.mono,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontFamily: theme.typography.mono,
  },
  ingredientList: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    gap: 8,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ingredientName: {
    color: "#C8C8C8",
    fontSize: 12,
    flex: 1,
    fontFamily: theme.typography.mono,
  },
  ingredientGrams: {
    color: theme.colors.text,
    fontSize: 12,
    fontFamily: theme.typography.mono,
  },
  moreItems: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1,
    fontFamily: theme.typography.mono,
  },
});
