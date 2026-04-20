create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Base', 'Sugar', 'Nut', 'Chocolate')),
  fat_pct numeric(6,2) not null default 0,
  sugar_pct numeric(6,2) not null default 0,
  solids_non_fat_pct numeric(6,2) not null default 0,
  other_solids_pct numeric(6,2) not null default 0,
  pac_value numeric(8,2) not null default 0,
  pod_value numeric(8,2) not null default 0,
  cost_per_kg numeric(10,2) not null default 0,
  is_cold_process boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade
);
create table if not exists public.stabilizers (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  product_name text not null,
  dosage_range_min numeric(5,2) not null,
  dosage_range_max numeric(5,2) not null,
  process_type text not null check (process_type in ('Hot', 'Cold'))
);
create unique index if not exists ingredients_default_name_idx
  on public.ingredients (lower(name))
  where user_id is null;
create unique index if not exists ingredients_user_name_idx
  on public.ingredients (user_id, lower(name))
  where user_id is not null;
create unique index if not exists stabilizers_brand_product_idx
  on public.stabilizers (lower(brand_name), lower(product_name), process_type);
alter table public.ingredients enable row level security;
alter table public.stabilizers enable row level security;
drop policy if exists "ingredients_select_global_or_owned" on public.ingredients;
create policy "ingredients_select_global_or_owned"
  on public.ingredients
  for select
  to anon, authenticated
  using (user_id is null or auth.uid() = user_id);
drop policy if exists "ingredients_insert_owned" on public.ingredients;
create policy "ingredients_insert_owned"
  on public.ingredients
  for insert
  to authenticated
  with check (auth.uid() = user_id);
drop policy if exists "ingredients_update_owned" on public.ingredients;
create policy "ingredients_update_owned"
  on public.ingredients
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "ingredients_delete_owned" on public.ingredients;
create policy "ingredients_delete_owned"
  on public.ingredients
  for delete
  to authenticated
  using (auth.uid() = user_id);
drop policy if exists "stabilizers_select_all" on public.stabilizers;
create policy "stabilizers_select_all"
  on public.stabilizers
  for select
  to anon, authenticated
  using (true);
