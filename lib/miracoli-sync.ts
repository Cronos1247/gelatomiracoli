import type { AppSettingRecord } from "@/lib/default-data";
import type { RecipeBookEntry } from "@/lib/storage";

export async function syncRecipeSnapshot(recipe: RecipeBookEntry) {
  const response = await fetch("/api/recipes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(recipe),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "Recipe snapshot sync failed.");
  }

  return (await response.json()) as { recipeId: string; syncedAt: string };
}

export async function syncLabSettings(
  settings: Pick<
    AppSettingRecord,
    "display_type" | "equipment_id" | "lab_name" | "logo_url" | "available_sugars" | "language"
  >
) {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "Lab settings sync failed.");
  }

  return (await response.json()) as { settingsId: string };
}

export async function syncLanguagePreference(language: NonNullable<AppSettingRecord["language"]>) {
  const response = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ language }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? "Language preference sync failed.");
  }

  return (await response.json()) as { settingsId: string };
}
