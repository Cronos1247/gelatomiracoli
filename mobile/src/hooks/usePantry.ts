import { useCallback, useEffect, useState } from "react";
import { loadPantry } from "../lib/pantry";
import type { MobileIngredient, PantryLoadResult } from "../types";

type PantryState = {
  loading: boolean;
  error: string | null;
  source: PantryLoadResult["source"];
  ingredients: MobileIngredient[];
};

export function usePantry() {
  const [state, setState] = useState<PantryState>({
    loading: true,
    error: null,
    source: "fallback",
    ingredients: [],
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const result = await loadPantry();
      setState({
        loading: false,
        error: null,
        source: result.source,
        ingredients: result.ingredients,
      });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load pantry.",
        source: "fallback",
        ingredients: [],
      });
    }
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const result = await loadPantry();

        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: null,
          source: result.source,
          ingredients: result.ingredients,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          loading: false,
          error: error instanceof Error ? error.message : "Failed to load pantry.",
          source: "fallback",
          ingredients: [],
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
