import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import type { LabIngredient } from "../lab/useRecipeLab";
import { theme } from "../theme";

type RecipeTableProps = {
  ingredients: LabIngredient[];
  batchWeightGrams: number;
  selectedRole?: string | null;
  editingPercentRole?: string | null;
  onSelectRow: (ingredient: LabIngredient) => void;
  onPressPercent: (ingredient: LabIngredient) => void;
  onPressGrams: (ingredient: LabIngredient) => void;
  onToggleLock: (ingredient: LabIngredient) => void;
  onDeleteRow?: (ingredient: LabIngredient) => void;
  onAddSuggestion?: (ingredient: LabIngredient) => void;
  renderPercentOverlay?: (ingredient: LabIngredient) => ReactNode;
};

function formatPercent(grams: number, batchWeightGrams: number) {
  return `${((grams / Math.max(batchWeightGrams, 1)) * 100).toFixed(1)}%`;
}

export function RecipeTable({
  ingredients,
  batchWeightGrams,
  selectedRole,
  editingPercentRole,
  onSelectRow,
  onPressPercent,
  onPressGrams,
  onToggleLock,
  onDeleteRow,
  onAddSuggestion,
  renderPercentOverlay,
}: RecipeTableProps) {
  const visibleIngredients = ingredients
    .filter((ingredient) => ingredient.grams > 0)
    .sort((left, right) => {
      const rank = (role: LabIngredient["role"]) => {
        if (role === "flavor") {
          return 0;
        }

        if (role === "totalbase") {
          return 1;
        }

        if (
          role === "sucrose" ||
          role === "dextrose" ||
          role === "erythritol" ||
          role === "polydextrose"
        ) {
          return 2;
        }

        if (role === "milk" || role === "cream" || role === "water" || role === "coconutFat") {
          return 3;
        }

        return 4;
      };

      const rankDelta = rank(left.role) - rank(right.role);
      if (rankDelta !== 0) {
        return rankDelta;
      }

      return 0;
    });

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.nameCell}>
          <Text style={[styles.headerCell, styles.headerNameText]}>INGREDIENT</Text>
        </View>
        <View style={styles.percentCell}>
          <Text style={[styles.headerCell, styles.headerPercentText]}>%</Text>
        </View>
        <View style={styles.gramsCell}>
          <Text style={[styles.headerCell, styles.headerGramsText]}>GRAMS</Text>
        </View>
        <View style={styles.lockCell}>
          <Text style={[styles.headerCell, styles.headerLockText]}>LOCK</Text>
        </View>
      </View>

      {visibleIngredients.map((ingredient) => (
        <TableRowGroup
          key={ingredient.role}
          ingredient={ingredient}
          batchWeightGrams={batchWeightGrams}
          selectedRole={selectedRole}
          editingPercentRole={editingPercentRole}
          onSelectRow={onSelectRow}
          onPressPercent={onPressPercent}
          onPressGrams={onPressGrams}
          onToggleLock={onToggleLock}
          onDeleteRow={onDeleteRow}
          onAddSuggestion={onAddSuggestion}
          renderPercentOverlay={renderPercentOverlay}
        />
      ))}
    </View>
  );
}

type TableRowGroupProps = {
  ingredient: LabIngredient;
  batchWeightGrams: number;
  selectedRole?: string | null;
  editingPercentRole?: string | null;
  onSelectRow: (ingredient: LabIngredient) => void;
  onPressPercent: (ingredient: LabIngredient) => void;
  onPressGrams: (ingredient: LabIngredient) => void;
  onToggleLock: (ingredient: LabIngredient) => void;
  onDeleteRow?: (ingredient: LabIngredient) => void;
  onAddSuggestion?: (ingredient: LabIngredient) => void;
  renderPercentOverlay?: (ingredient: LabIngredient) => ReactNode;
};

function TableRowGroup({
  ingredient,
  batchWeightGrams,
  selectedRole,
  editingPercentRole,
  onSelectRow,
  onPressPercent,
  onPressGrams,
  onToggleLock,
  onDeleteRow,
  onAddSuggestion,
  renderPercentOverlay,
}: TableRowGroupProps) {
  const rowDisabled = ingredient.role === "totalbase";
  const canDelete = !rowDisabled && !ingredient.ghost && ingredient.role !== "flavor";

  const rowContent = (
    <Pressable
      onPress={() => {
        if (rowDisabled) {
          return;
        }

        onSelectRow(ingredient);
      }}
      style={[
        styles.row,
        selectedRole === ingredient.role && styles.rowActive,
        ingredient.ghost && styles.rowGhost,
      ]}
    >
      <View style={styles.nameCell}>
        <Text style={[styles.name, ingredient.role === "totalbase" && styles.nameTotalbase]}>
          {ingredient.name}
        </Text>
        {ingredient.ghost && ingredient.suggestionCtaLabel && onAddSuggestion ? (
          <Pressable
            onPress={() => onAddSuggestion(ingredient)}
            style={styles.suggestionButton}
          >
            <Text style={styles.suggestionButtonText}>{ingredient.suggestionCtaLabel}</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        onPress={() => {
          if (rowDisabled) {
            return;
          }

          onPressPercent(ingredient);
        }}
        style={styles.percentCell}
      >
        <Text style={styles.percentText}>
          {formatPercent(ingredient.grams, batchWeightGrams)}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          if (rowDisabled) {
            return;
          }

          onPressGrams(ingredient);
        }}
        style={styles.gramsCell}
      >
        <Text style={styles.gramsText}>{Math.round(ingredient.grams)}</Text>
      </Pressable>

      <Pressable
        onPress={() => {
          if (rowDisabled) {
            return;
          }

          onToggleLock(ingredient);
        }}
        style={styles.lockCell}
      >
        <Text style={[styles.lockText, ingredient.locked && styles.lockTextActive]}>
          {ingredient.locked ? "LOCK" : "OPEN"}
        </Text>
      </Pressable>
    </Pressable>
  );

  return (
    <View>
      {canDelete && onDeleteRow ? (
        <Swipeable
          overshootRight={false}
          renderRightActions={() => (
            <Pressable onPress={() => onDeleteRow(ingredient)} style={styles.deleteAction}>
              <Text style={styles.deleteActionIcon}>🗑</Text>
            </Pressable>
          )}
        >
          {rowContent}
        </Swipeable>
      ) : (
        rowContent
      )}

      {editingPercentRole === ingredient.role && renderPercentOverlay ? (
        <View style={styles.overlayRow}>{renderPercentOverlay(ingredient)}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
    width: "100%",
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 16,
  },
  rowActive: {
    backgroundColor: "#121212",
  },
  rowGhost: {
    opacity: 0.5,
  },
  overlayRow: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 10,
  },
  headerCell: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1.3,
    fontFamily: theme.typography.mono,
  },
  nameCell: {
    flex: 1.9,
    paddingRight: 12,
  },
  percentCell: {
    width: 70,
    alignItems: "flex-end",
  },
  gramsCell: {
    width: 76,
    alignItems: "flex-end",
  },
  lockCell: {
    width: 64,
    alignItems: "center",
  },
  headerNameText: {
    textAlign: "left",
  },
  headerPercentText: {
    width: "100%",
    textAlign: "right",
  },
  headerGramsText: {
    width: "100%",
    textAlign: "right",
  },
  headerLockText: {
    width: "100%",
    textAlign: "center",
  },
  name: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    letterSpacing: 0.8,
    fontFamily: theme.typography.sans,
  },
  nameTotalbase: {
    color: "#E5E5E5",
  },
  suggestionButton: {
    marginTop: 8,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.text,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  suggestionButtonText: {
    color: theme.colors.text,
    fontSize: 10,
    fontFamily: theme.typography.mono,
  },
  percentText: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 14,
    fontFamily: theme.typography.mono,
  },
  gramsText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: theme.typography.mono,
    fontWeight: "800",
  },
  lockText: {
    color: theme.colors.text,
    backgroundColor: "#1A1A1A",
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontFamily: theme.typography.mono,
    overflow: "hidden",
    textAlign: "center",
  },
  lockTextActive: {
    color: theme.colors.background,
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  deleteAction: {
    width: 72,
    alignSelf: "stretch",
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteActionIcon: {
    color: "#FFFFFF",
    fontSize: 18,
  },
});
