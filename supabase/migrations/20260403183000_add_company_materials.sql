create table if not exists public.company_materials (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  item_name text not null,
  parent_category text not null,
  unit_multiplier numeric(10,2) not null default 1,
  is_private boolean not null default true
);
create index if not exists company_materials_company_id_idx
  on public.company_materials(company_id);
create unique index if not exists company_materials_company_item_parent_idx
  on public.company_materials(company_id, lower(item_name), lower(parent_category));
alter table public.company_materials enable row level security;
drop policy if exists "company_materials select own company" on public.company_materials;
drop policy if exists "company_materials insert own company" on public.company_materials;
drop policy if exists "company_materials update own company" on public.company_materials;
drop policy if exists "company_materials delete own company" on public.company_materials;
create policy "company_materials select own company"
on public.company_materials
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.company_id = company_materials.company_id
  )
);
create policy "company_materials insert own company"
on public.company_materials
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.company_id = company_materials.company_id
  )
);
create policy "company_materials update own company"
on public.company_materials
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.company_id = company_materials.company_id
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.company_id = company_materials.company_id
  )
);
create policy "company_materials delete own company"
on public.company_materials
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = (select auth.uid())
      and profiles.company_id = company_materials.company_id
  )
);
