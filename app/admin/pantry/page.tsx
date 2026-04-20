import { ProtectedRoute } from "@/src/miracoli/components/ProtectedRoute";
import { MasterAdminWorkbench } from "@/src/miracoli/pantry/MasterAdminWorkbench";
import { getIngredientCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AdminPantryPage() {
  const ingredientCatalog = await getIngredientCatalog();

  return (
    <ProtectedRoute
      title="Master Admin Workbench"
      description="This route is reserved for the Miracoli master pantry workflow."
      bootstrapMasterAdminSession
    >
      <MasterAdminWorkbench initialIngredients={ingredientCatalog.items} />
    </ProtectedRoute>
  );
}
