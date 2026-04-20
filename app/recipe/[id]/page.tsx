import { RecipeDetailView } from "@/components/RecipeDetailView";
import { getIngredientCatalog } from "@/lib/catalog";

type RecipeDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const ingredientCatalog = await getIngredientCatalog();

  return <RecipeDetailView recipeId={id} ingredients={ingredientCatalog.items} />;
}
