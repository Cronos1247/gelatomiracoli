export {
  TARGET_PROFILES,
  ARCHETYPES,
  calculateOutputVolume,
  rebalanceRecipe,
  balanceGelato,
  type ArchetypeKey,
} from "./balance-gelato";
export { useReactiveBalancer } from "./useReactiveBalancer";
export { useEquipmentPhysics, type OutputViewMode } from "./useEquipmentPhysics";
export { useCalculatedEconomics } from "./useCalculatedEconomics";
export {
  FlavorArchetypes,
  archetypeRecipes,
  resolveFlavorArchetype,
  type FlavorArchetypeKey,
  type ResolvedFlavorArchetype,
} from "@/lib/template-engine";
