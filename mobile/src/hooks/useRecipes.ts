import { useCallback, useEffect, useState } from "react";
import { loadSavedRecipes } from "../lib/recipes";
import type { MobileSavedRecipe, RecipeLoadResult } from "../types";

type RecipeState = {
  loading: boolean;
  error: string | null;
  source: RecipeLoadResult["source"];
  recipes: MobileSavedRecipe[];
};

export function useRecipes() {
  const [state, setState] = useState<RecipeState>({
    loading: true,
    error: null,
    source: "fallback",
    recipes: [],
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const result = await loadSavedRecipes();
      setState({
        loading: false,
        error: null,
        source: result.source,
        recipes: result.recipes,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load saved recipes.",
        source: "fallback",
        recipes: [],
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const result = await loadSavedRecipes();

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: null,
          source: result.source,
          recipes: result.recipes,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load saved recipes.",
          source: "fallback",
          recipes: [],
        });
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  return {
    ...state,
    refresh,
  };
}
