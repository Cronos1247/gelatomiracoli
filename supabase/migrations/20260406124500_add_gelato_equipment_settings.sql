create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  heating_capability boolean not null default true,
  max_batch_kg numeric(8,2) not null,
  default_overrun_pct numeric(6,2) not null default 0
);
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  display_type text not null check (display_type in ('Standard Case', 'Pozzetti')),
  equipment_id uuid references public.equipment(id) on delete set null,
  lab_name text,
  logo_url text,
  available_sugars text[] not null default array['Sucrose', 'Dextrose', 'Invert Sugar']::text[]
);
create unique index if not exists equipment_brand_model_idx
  on public.equipment (lower(brand), lower(model));
create unique index if not exists settings_global_default_idx
  on public.settings ((coalesce(user_id::text, 'global')))
  where user_id is null;
alter table public.equipment enable row level security;
alter table public.settings enable row level security;
drop policy if exists "equipment_select_all" on public.equipment;
create policy "equipment_select_all"
  on public.equipment
  for select
  to anon, authenticated
  using (true);
drop policy if exists "settings_select_global_or_owned" on public.settings;
create policy "settings_select_global_or_owned"
  on public.settings
  for select
  to anon, authenticated
  using (user_id is null or auth.uid() = user_id);
drop policy if exists "settings_insert_owned_or_global" on public.settings;
create policy "settings_insert_owned_or_global"
  on public.settings
  for insert
  to authenticated
  with check (user_id is null or auth.uid() = user_id);
drop policy if exists "settings_update_owned_or_global" on public.settings;
create policy "settings_update_owned_or_global"
  on public.settings
  for update
  to authenticated
  using (user_id is null or auth.uid() = user_id)
  with check (user_id is null or auth.uid() = user_id);
