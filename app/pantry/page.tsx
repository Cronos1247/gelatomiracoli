import { PantryView } from "@/components/PantryView";
import {
  getDefaultSettings,
  getEquipmentCatalog,
  getIngredientCatalog,
  type CatalogSource,
} from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  const [ingredientCatalog, equipmentCatalog, settingsCatalog] = await Promise.all([
    getIngredientCatalog(),
    getEquipmentCatalog(),
    getDefaultSettings(),
  ]);
  const dataSource: CatalogSource = ingredientCatalog.source;
  const selectedEquipment =
    equipmentCatalog.items.find((item) => item.id === settingsCatalog.item.equipment_id) ??
    equipmentCatalog.items[0];

  return (
    <PantryView
      ingredients={ingredientCatalog.items}
      dataSource={dataSource}
      selectedEquipment={selectedEquipment}
    />
  );
}
