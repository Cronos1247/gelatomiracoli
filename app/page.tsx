import { GelatoStudio } from "@/components/GelatoStudio";
import {
  getDefaultSettings,
  getEquipmentCatalog,
  getIngredientCatalog,
  getStabilizerCatalog,
  type CatalogSource,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [ingredientCatalog, stabilizerCatalog, equipmentCatalog, settingsCatalog] =
    await Promise.all([
      getIngredientCatalog(),
      getStabilizerCatalog(),
      getEquipmentCatalog(),
      getDefaultSettings(),
    ]);

  const dataSource: CatalogSource =
    ingredientCatalog.source === "supabase" ||
    stabilizerCatalog.source === "supabase" ||
    equipmentCatalog.source === "supabase" ||
    settingsCatalog.source === "supabase"
      ? "supabase"
      : "fallback";

  return (
    <GelatoStudio
      ingredients={ingredientCatalog.items}
      stabilizers={stabilizerCatalog.items}
      equipment={equipmentCatalog.items}
      settings={settingsCatalog.item}
      dataSource={dataSource}
    />
  );
}
