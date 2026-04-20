create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  total_weight_grams numeric not null default 0,
  equipment_id uuid null references public.equipment (id) on delete set null,
  logic_snapshot jsonb not null default '{}'::jsonb,
  is_sorbet boolean not null default false
);
create index if not exists recipes_created_at_idx on public.recipes (created_at desc);
create index if not exists recipes_equipment_id_idx on public.recipes (equipment_id);
create table if not exists public.recipe_items (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid null references public.ingredients (id) on delete set null,
  ingredient_name text not null,
  grams numeric not null default 0,
  percentage numeric not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists recipe_items_recipe_id_idx on public.recipe_items (recipe_id);
create index if not exists recipe_items_ingredient_id_idx on public.recipe_items (ingredient_id);
