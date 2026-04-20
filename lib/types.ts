export interface Recipe {
  id: string;
  name: string;
  archetype: string;
  total_pac: number;
  total_pod: number;
  total_solids: number;
  is_on_display: boolean;
  active_case_id: string | null;
}

export interface DisplayCase {
  id: string;
  user_id: string;
  name: string;
  capacity_pans: number;
  target_temp_c: number;
  pac_range_min: number;
  pac_range_max: number;
  display_order: number;
  active_recipes?: Recipe[];
}
