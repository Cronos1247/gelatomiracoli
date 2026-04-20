-- Legacy baseline migration assembled from formerly loose setup scripts.
-- Source scripts are archived under supabase/archive/legacy-sql/.
-- Note: this captures the tracked feature SQL that existed in-repo before migrations
-- were added. Some older base tables predate these scripts and are not reconstructed here.

-- Source: saas-auth-company-setup.sql (last modified 2026-04-01 10:57:53)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_type text check (plan_type is null or plan_type in ('pro')),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('internal', 'tester', 'active', 'trialing', 'past_due')),
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);
update public.companies
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
where trial_ends_at is null;
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now()
);
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  company_name text not null,
  access_type text not null default 'tester'
    check (access_type in ('tester')),
  created_by_company_id uuid not null references public.companies(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_company_id uuid references public.companies(id) on delete set null,
  redeemed_by_user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  redeemed_at timestamptz,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.projects
add column if not exists company_id uuid references public.companies(id) on delete cascade;
create index if not exists projects_company_id_idx on public.projects(company_id);
create index if not exists issues_project_id_idx on public.issues(project_id);
create index if not exists bid_rows_project_id_idx on public.bid_rows(project_id);
create index if not exists project_files_project_id_idx on public.project_files(project_id);
create index if not exists profiles_company_id_idx on public.profiles(company_id);
create index if not exists invite_codes_created_by_company_id_idx
  on public.invite_codes(created_by_company_id);
create index if not exists invite_codes_redeemed_at_idx
  on public.invite_codes(redeemed_at);
create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
$$;
grant execute on function public.current_company_id() to authenticated;
create or replace function public.current_company_subscription_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select subscription_status
  from public.companies
  where id = public.current_company_id()
$$;
grant execute on function public.current_company_subscription_status() to authenticated;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  generated_company_name text;
  normalized_invite_code text;
  invited_company_name text;
  invited_access_type text;
  resolved_subscription_status text := 'trialing';
  resolved_trial_ends_at timestamptz := now() + interval '14 days';
begin
  normalized_invite_code := upper(nullif(new.raw_user_meta_data ->> 'invite_code', ''));

  if normalized_invite_code is not null then
    select company_name, access_type
    into invited_company_name, invited_access_type
    from public.invite_codes
    where code = normalized_invite_code
      and disabled = false
      and redeemed_at is null
      and (expires_at is null or expires_at > now())
    limit 1;

    if invited_access_type = 'tester' then
      resolved_subscription_status := 'tester';
      resolved_trial_ends_at := now() + interval '14 days';
    end if;
  end if;

  generated_company_name :=
    coalesce(
      nullif(new.raw_user_meta_data ->> 'company_name', ''),
      nullif(invited_company_name, ''),
      split_part(coalesce(new.email, 'new-company'), '@', 1) || ' Company'
    );

  insert into public.companies (name, subscription_status, trial_ends_at)
  values (generated_company_name, resolved_subscription_status, resolved_trial_ends_at)
  returning id into new_company_id;

  insert into public.profiles (id, company_id, email)
  values (new.id, new_company_id, new.email);

  if normalized_invite_code is not null and invited_access_type = 'tester' then
    update public.invite_codes
    set redeemed_at = now(),
        redeemed_by_user_id = new.id,
        redeemed_company_id = new_company_id
    where code = normalized_invite_code
      and redeemed_at is null;
  end if;

  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
create or replace function public.claim_unassigned_projects(target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_company uuid;
begin
  select company_id into target_company
  from public.profiles
  where email = target_email;

  if target_company is null then
    raise exception 'No profile found for email %', target_email;
  end if;

  update public.projects
  set company_id = target_company
  where company_id is null;
end;
$$;
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.invite_codes enable row level security;
alter table public.projects enable row level security;
alter table public.issues enable row level security;
alter table public.bid_rows enable row level security;
alter table public.project_files enable row level security;
drop policy if exists "profiles select own" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "companies select own company" on public.companies;
drop policy if exists "companies update own company" on public.companies;
drop policy if exists "invite_codes select internal" on public.invite_codes;
drop policy if exists "invite_codes insert internal" on public.invite_codes;
drop policy if exists "invite_codes update internal" on public.invite_codes;
drop policy if exists "invite_codes delete internal" on public.invite_codes;
drop policy if exists "projects select own company" on public.projects;
drop policy if exists "projects insert own company" on public.projects;
drop policy if exists "projects update own company" on public.projects;
drop policy if exists "projects delete own company" on public.projects;
drop policy if exists "issues select own company" on public.issues;
drop policy if exists "issues insert own company" on public.issues;
drop policy if exists "issues update own company" on public.issues;
drop policy if exists "issues delete own company" on public.issues;
drop policy if exists "bid_rows select own company" on public.bid_rows;
drop policy if exists "bid_rows insert own company" on public.bid_rows;
drop policy if exists "bid_rows update own company" on public.bid_rows;
drop policy if exists "bid_rows delete own company" on public.bid_rows;
drop policy if exists "project_files select own company" on public.project_files;
drop policy if exists "project_files insert own company" on public.project_files;
drop policy if exists "project_files update own company" on public.project_files;
drop policy if exists "project_files delete own company" on public.project_files;
drop policy if exists "anon can read project_files" on public.project_files;
drop policy if exists "anon can insert project_files" on public.project_files;
drop policy if exists "authenticated can read project_files" on public.project_files;
drop policy if exists "authenticated can insert project_files" on public.project_files;
create policy "profiles select own"
on public.profiles
for select
to authenticated
using (id = auth.uid());
create policy "profiles update own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
create policy "companies select own company"
on public.companies
for select
to authenticated
using (id = public.current_company_id());
create policy "companies update own company"
on public.companies
for update
to authenticated
using (id = public.current_company_id())
with check (id = public.current_company_id());
create policy "invite_codes select internal"
on public.invite_codes
for select
to authenticated
using (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
);
create policy "invite_codes insert internal"
on public.invite_codes
for insert
to authenticated
with check (
  created_by_company_id = public.current_company_id()
  and created_by_user_id = auth.uid()
  and public.current_company_subscription_status() = 'internal'
);
create policy "invite_codes update internal"
on public.invite_codes
for update
to authenticated
using (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
)
with check (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
);
create policy "invite_codes delete internal"
on public.invite_codes
for delete
to authenticated
using (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
);
create policy "projects select own company"
on public.projects
for select
to authenticated
using (company_id = public.current_company_id());
create policy "projects insert own company"
on public.projects
for insert
to authenticated
with check (company_id = public.current_company_id());
create policy "projects update own company"
on public.projects
for update
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());
create policy "projects delete own company"
on public.projects
for delete
to authenticated
using (company_id = public.current_company_id());
create policy "issues select own company"
on public.issues
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = issues.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "issues insert own company"
on public.issues
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = issues.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "issues update own company"
on public.issues
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = issues.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = issues.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "issues delete own company"
on public.issues
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = issues.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_rows select own company"
on public.bid_rows
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = bid_rows.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_rows insert own company"
on public.bid_rows
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = bid_rows.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_rows update own company"
on public.bid_rows
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = bid_rows.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = bid_rows.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_rows delete own company"
on public.bid_rows
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = bid_rows.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_files select own company"
on public.project_files
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_files insert own company"
on public.project_files
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_files update own company"
on public.project_files
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_files delete own company"
on public.project_files
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_files.project_id
      and projects.company_id = public.current_company_id()
  )
);
drop policy if exists "anon can upload to project-files bucket" on storage.objects;
drop policy if exists "anon can read project-files bucket" on storage.objects;
drop policy if exists "authenticated can upload to project-files bucket" on storage.objects;
drop policy if exists "authenticated can read project-files bucket" on storage.objects;
drop policy if exists "authenticated can delete from project-files bucket" on storage.objects;
create policy "authenticated can read project-files bucket"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'project-files'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.company_id = public.current_company_id()
  )
);
create policy "authenticated can upload to project-files bucket"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'project-files'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.company_id = public.current_company_id()
  )
);
create policy "authenticated can delete from project-files bucket"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'project-files'
  and exists (
    select 1
    from public.projects
    where projects.id::text = (storage.foldername(name))[2]
      and projects.company_id = public.current_company_id()
  )
);
-- Source: supplier-scope-export-metadata-setup.sql (last modified 2026-03-24 13:58:34)
alter table public.companies
add column if not exists address text,
add column if not exists phone text;
alter table public.projects
add column if not exists customer_name text,
add column if not exists proposal_type text,
add column if not exists proposal_validity_days integer;
-- Source: cost-library-setup.sql (last modified 2026-03-23 17:22:44)
create table if not exists public.cost_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  name text not null,
  unit text,
  category text,
  item_type text not null default 'simple',
  material_cost numeric not null default 0,
  labor_cost numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cost_items
add column if not exists category text,
add column if not exists item_type text not null default 'simple',
add column if not exists notes text,
add column if not exists updated_at timestamptz not null default now();
alter table public.bid_rows
add column if not exists cost_item_id uuid references public.cost_items(id) on delete set null;
create index if not exists cost_items_company_id_idx
on public.cost_items(company_id);
create index if not exists bid_rows_cost_item_id_idx
on public.bid_rows(cost_item_id);
alter table public.cost_items enable row level security;
create or replace function public.set_cost_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_cost_items_updated_at on public.cost_items;
create trigger set_cost_items_updated_at
before update on public.cost_items
for each row
execute function public.set_cost_items_updated_at();
drop policy if exists "cost_items select own company" on public.cost_items;
drop policy if exists "cost_items insert own company" on public.cost_items;
drop policy if exists "cost_items update own company" on public.cost_items;
drop policy if exists "cost_items delete own company" on public.cost_items;
create policy "cost_items select own company"
on public.cost_items
for select
to authenticated
using (company_id = public.current_company_id());
create policy "cost_items insert own company"
on public.cost_items
for insert
to authenticated
with check (company_id = public.current_company_id());
create policy "cost_items update own company"
on public.cost_items
for update
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());
create policy "cost_items delete own company"
on public.cost_items
for delete
to authenticated
using (company_id = public.current_company_id());
-- Source: cost-library-assemblies-setup.sql (last modified 2026-03-30 09:20:27)
create table if not exists public.cost_item_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  assembly_cost_item_id uuid not null references public.cost_items(id) on delete cascade,
  component_cost_item_id uuid not null references public.cost_items(id),
  quantity numeric not null default 1,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cost_item_components_positive_quantity check (quantity > 0),
  constraint cost_item_components_unique_component unique (assembly_cost_item_id, component_cost_item_id)
);
create index if not exists cost_item_components_company_id_idx
on public.cost_item_components(company_id);
create index if not exists cost_item_components_assembly_idx
on public.cost_item_components(assembly_cost_item_id);
create index if not exists cost_item_components_component_idx
on public.cost_item_components(component_cost_item_id);
alter table public.cost_item_components enable row level security;
create or replace function public.set_cost_item_components_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_cost_item_components_updated_at on public.cost_item_components;
create trigger set_cost_item_components_updated_at
before update on public.cost_item_components
for each row
execute function public.set_cost_item_components_updated_at();
drop policy if exists "cost_item_components select own company" on public.cost_item_components;
drop policy if exists "cost_item_components insert own company" on public.cost_item_components;
drop policy if exists "cost_item_components update own company" on public.cost_item_components;
drop policy if exists "cost_item_components delete own company" on public.cost_item_components;
create policy "cost_item_components select own company"
on public.cost_item_components
for select
to authenticated
using (company_id = public.current_company_id());
create policy "cost_item_components insert own company"
on public.cost_item_components
for insert
to authenticated
with check (company_id = public.current_company_id());
create policy "cost_item_components update own company"
on public.cost_item_components
for update
to authenticated
using (company_id = public.current_company_id())
with check (company_id = public.current_company_id());
create policy "cost_item_components delete own company"
on public.cost_item_components
for delete
to authenticated
using (company_id = public.current_company_id());
create or replace function public.seed_default_cost_library(target_company_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  simple_names text[];
begin
  if target_company_id is null then
    raise exception 'target_company_id is required';
  end if;

  insert into public.cost_items (company_id, name, item_type, category, unit, material_cost, labor_cost, notes)
  select
    target_company_id,
    seed.name,
    seed.item_type,
    seed.category,
    seed.unit,
    seed.material_cost,
    seed.labor_cost,
    seed.notes
  from (
    values
      ('Journeyman Plumber', 'simple', 'Labor', 'HR', 0::numeric, 85.00::numeric, null::text),
      ('3" PVC Schedule 40 Pipe', 'simple', 'Rough-In', 'LF', 4.50::numeric, 0::numeric, null::text),
      ('1/2" PEX-A Pipe', 'simple', 'Rough-In', 'LF', 0.85::numeric, 0::numeric, null::text),
      ('Wax Ring with Brass Bolts', 'simple', 'Fittings', 'EA', 8.50::numeric, 0::numeric, null::text),
      ('3" PVC Closet Flange', 'simple', 'Fittings', 'EA', 12.00::numeric, 0::numeric, null::text),
      ('1/2" x 3/8" Chrome Angle Stop', 'simple', 'Valves', 'EA', 14.00::numeric, 0::numeric, null::text),
      ('12" Braided Supply Line', 'simple', 'Fittings', 'EA', 9.00::numeric, 0::numeric, null::text),
      ('1-1/2" PVC P-Trap', 'simple', 'Fittings', 'EA', 6.50::numeric, 0::numeric, null::text),
      ('Standard Toilet Bowl & Tank', 'simple', 'Fixtures', 'EA', 200.00::numeric, 0::numeric, null::text),
      ('Drop-in Lavatory Basin', 'simple', 'Fixtures', 'EA', 95.00::numeric, 0::numeric, null::text),
      ('Single-Handle Lav Faucet', 'simple', 'Fixtures', 'EA', 120.00::numeric, 0::numeric, null::text),
      ('Fiberglass Tub/Shower Combo', 'simple', 'Fixtures', 'EA', 450.00::numeric, 0::numeric, null::text),
      ('Pressure Balanced Shower Valve', 'simple', 'Valves', 'EA', 185.00::numeric, 0::numeric, null::text),
      ('50-Gal Electric Water Heater', 'simple', 'Equipment', 'EA', 850.00::numeric, 0::numeric, null::text)
  ) as seed(name, item_type, category, unit, material_cost, labor_cost, notes)
  where not exists (
    select 1
    from public.cost_items existing
    where existing.company_id = target_company_id
      and existing.name = seed.name
  );

  insert into public.cost_items (company_id, name, item_type, category, unit, material_cost, labor_cost, notes)
  select
    target_company_id,
    seed.name,
    seed.item_type,
    seed.category,
    seed.unit,
    seed.material_cost,
    seed.labor_cost,
    seed.notes
  from (
    values
      ('Standard Water Closet (Toilet) Assembly', 'assembly', 'Plumbing Fixtures', 'EA', 0::numeric, 0::numeric, 'Standard floor-mount gravity fed toilet complete with rough-in piping.'::text),
      ('Standard Lavatory (Sink) Assembly', 'assembly', 'Plumbing Fixtures', 'EA', 0::numeric, 0::numeric, 'Drop-in basin with single handle faucet and hot/cold rough-in.'::text),
      ('Tub & Shower Combo Assembly', 'assembly', 'Plumbing Fixtures', 'EA', 0::numeric, 0::numeric, 'Standard fiberglass insert with mixing valve.'::text)
  ) as seed(name, item_type, category, unit, material_cost, labor_cost, notes)
  where not exists (
    select 1
    from public.cost_items existing
    where existing.company_id = target_company_id
      and existing.name = seed.name
  );

  insert into public.cost_item_components (company_id, assembly_cost_item_id, component_cost_item_id, quantity, sort_order)
  select
    target_company_id,
    assembly_item.id,
    component_item.id,
    component_def.quantity,
    component_def.sort_order
  from (
    values
      ('Standard Water Closet (Toilet) Assembly', 'Standard Toilet Bowl & Tank', 1::numeric, 1),
      ('Standard Water Closet (Toilet) Assembly', 'Wax Ring with Brass Bolts', 1::numeric, 2),
      ('Standard Water Closet (Toilet) Assembly', '3" PVC Closet Flange', 1::numeric, 3),
      ('Standard Water Closet (Toilet) Assembly', '1/2" x 3/8" Chrome Angle Stop', 1::numeric, 4),
      ('Standard Water Closet (Toilet) Assembly', '12" Braided Supply Line', 1::numeric, 5),
      ('Standard Water Closet (Toilet) Assembly', '3" PVC Schedule 40 Pipe', 15::numeric, 6),
      ('Standard Water Closet (Toilet) Assembly', '1/2" PEX-A Pipe', 10::numeric, 7),
      ('Standard Water Closet (Toilet) Assembly', 'Journeyman Plumber', 4::numeric, 8),
      ('Standard Lavatory (Sink) Assembly', 'Drop-in Lavatory Basin', 1::numeric, 1),
      ('Standard Lavatory (Sink) Assembly', 'Single-Handle Lav Faucet', 1::numeric, 2),
      ('Standard Lavatory (Sink) Assembly', '1-1/2" PVC P-Trap', 1::numeric, 3),
      ('Standard Lavatory (Sink) Assembly', '1/2" x 3/8" Chrome Angle Stop', 2::numeric, 4),
      ('Standard Lavatory (Sink) Assembly', '12" Braided Supply Line', 2::numeric, 5),
      ('Standard Lavatory (Sink) Assembly', '1/2" PEX-A Pipe', 20::numeric, 6),
      ('Standard Lavatory (Sink) Assembly', 'Journeyman Plumber', 3::numeric, 7),
      ('Tub & Shower Combo Assembly', 'Fiberglass Tub/Shower Combo', 1::numeric, 1),
      ('Tub & Shower Combo Assembly', 'Pressure Balanced Shower Valve', 1::numeric, 2),
      ('Tub & Shower Combo Assembly', '1-1/2" PVC P-Trap', 1::numeric, 3),
      ('Tub & Shower Combo Assembly', '1/2" PEX-A Pipe', 25::numeric, 4),
      ('Tub & Shower Combo Assembly', 'Journeyman Plumber', 6::numeric, 5)
  ) as component_def(assembly_name, component_name, quantity, sort_order)
  join public.cost_items assembly_item
    on assembly_item.company_id = target_company_id
   and assembly_item.name = component_def.assembly_name
  join public.cost_items component_item
    on component_item.company_id = target_company_id
   and component_item.name = component_def.component_name
  on conflict (assembly_cost_item_id, component_cost_item_id)
  do update
  set quantity = excluded.quantity,
      sort_order = excluded.sort_order,
      updated_at = now();

  update public.cost_items assembly_item
  set material_cost = coalesce(rollup.material_cost, 0),
      labor_cost = coalesce(rollup.labor_cost, 0),
      updated_at = now()
  from (
    select
      component.assembly_cost_item_id,
      sum(component.quantity * coalesce(component_item.material_cost, 0)) as material_cost,
      sum(component.quantity * coalesce(component_item.labor_cost, 0)) as labor_cost
    from public.cost_item_components component
    join public.cost_items component_item
      on component_item.id = component.component_cost_item_id
    where component.company_id = target_company_id
    group by component.assembly_cost_item_id
  ) as rollup
  where assembly_item.id = rollup.assembly_cost_item_id;
end;
$$;
revoke all on function public.seed_default_cost_library(uuid) from public;
grant execute on function public.seed_default_cost_library(uuid) to authenticated;
create or replace function public.admin_import_cost_library(
  import_items jsonb,
  import_recipes jsonb,
  clear_existing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  active_company_id uuid;
  imported_item_count integer := 0;
  imported_recipe_count integer := 0;
begin
  active_company_id := public.current_company_id();

  if active_company_id is null then
    raise exception 'No active company is available for cost library import.';
  end if;

  if jsonb_typeof(import_items) is distinct from 'array' then
    raise exception 'Import items payload must be a JSON array.';
  end if;

  if jsonb_typeof(import_recipes) is distinct from 'array' then
    raise exception 'Import recipes payload must be a JSON array.';
  end if;

  create temporary table temp_import_items (
    csv_item_id text primary key,
    item_type text not null,
    name text not null,
    category text,
    unit text,
    material_cost numeric not null default 0,
    labor_cost numeric not null default 0,
    notes text
  ) on commit drop;

  insert into temp_import_items (
    csv_item_id,
    item_type,
    name,
    category,
    unit,
    material_cost,
    labor_cost,
    notes
  )
  select
    trim(item_id),
    lower(trim(item_type)),
    trim(name),
    nullif(trim(category), ''),
    nullif(trim(unit), ''),
    coalesce(material_cost, 0),
    coalesce(labor_cost, 0),
    nullif(trim(notes), '')
  from jsonb_to_recordset(import_items) as payload(
    item_id text,
    item_type text,
    name text,
    category text,
    unit text,
    material_cost numeric,
    labor_cost numeric,
    notes text
  );

  if exists (
    select 1
    from temp_import_items
    where csv_item_id is null
      or csv_item_id = ''
      or name is null
      or name = ''
      or item_type not in ('simple', 'assembly')
  ) then
    raise exception 'Import items contain missing required values or invalid item types.';
  end if;

  create temporary table temp_import_recipes (
    parent_assembly_id text not null,
    component_item_id text not null,
    quantity numeric not null,
    sort_order integer
  ) on commit drop;

  insert into temp_import_recipes (
    parent_assembly_id,
    component_item_id,
    quantity,
    sort_order
  )
  select
    trim(parent_assembly_id),
    trim(component_item_id),
    quantity,
    sort_order
  from jsonb_to_recordset(import_recipes) as payload(
    parent_assembly_id text,
    component_item_id text,
    quantity numeric,
    sort_order integer
  );

  if exists (
    select 1
    from temp_import_recipes recipe
    left join temp_import_items parent_item
      on parent_item.csv_item_id = recipe.parent_assembly_id
    left join temp_import_items component_item
      on component_item.csv_item_id = recipe.component_item_id
    where recipe.parent_assembly_id = ''
      or recipe.component_item_id = ''
      or recipe.quantity <= 0
      or parent_item.csv_item_id is null
      or component_item.csv_item_id is null
      or parent_item.item_type <> 'assembly'
  ) then
    raise exception 'Import recipes contain orphaned items, invalid quantities, or non-assembly parents.';
  end if;

  if clear_existing then
    if exists (
      select 1
      from public.projects project
      join public.bid_rows bid_row
        on bid_row.project_id = project.id
      where project.company_id = active_company_id
        and bid_row.cost_item_id is not null
      limit 1
    ) then
      raise exception 'Cannot clear the cost library while bid rows still reference cost items.';
    end if;

    delete from public.cost_item_components
    where company_id = active_company_id;

    delete from public.cost_items
    where company_id = active_company_id;
  elsif exists (
    select 1
    from public.cost_items existing
    join temp_import_items incoming
      on lower(existing.name) = lower(incoming.name)
    where existing.company_id = active_company_id
  ) then
    raise exception 'Imported item names already exist in this cost library. Use clear existing or rename the duplicates.';
  end if;

  create temporary table temp_import_id_map (
    csv_item_id text primary key,
    cost_item_id uuid not null
  ) on commit drop;

  insert into public.cost_items (
    company_id,
    name,
    item_type,
    category,
    unit,
    material_cost,
    labor_cost,
    notes
  )
  select
    active_company_id,
    item.name,
    item.item_type,
    item.category,
    item.unit,
    case when item.item_type = 'assembly' then 0 else item.material_cost end,
    case when item.item_type = 'assembly' then 0 else item.labor_cost end,
    item.notes
  from temp_import_items item;

  insert into temp_import_id_map (csv_item_id, cost_item_id)
  select
    item.csv_item_id,
    cost_item.id
  from temp_import_items item
  join public.cost_items cost_item
    on cost_item.company_id = active_company_id
   and cost_item.name = item.name;

  insert into public.cost_item_components (
    company_id,
    assembly_cost_item_id,
    component_cost_item_id,
    quantity,
    sort_order
  )
  select
    active_company_id,
    parent_map.cost_item_id,
    component_map.cost_item_id,
    recipe.quantity,
    coalesce(recipe.sort_order, row_number() over (
      partition by recipe.parent_assembly_id
      order by recipe.parent_assembly_id, recipe.component_item_id
    ) - 1)
  from temp_import_recipes recipe
  join temp_import_id_map parent_map
    on parent_map.csv_item_id = recipe.parent_assembly_id
  join temp_import_id_map component_map
    on component_map.csv_item_id = recipe.component_item_id;

  update public.cost_items assembly_item
  set material_cost = coalesce(rollup.material_cost, 0),
      labor_cost = coalesce(rollup.labor_cost, 0),
      updated_at = now()
  from (
    select
      component.assembly_cost_item_id,
      sum(component.quantity * coalesce(component_item.material_cost, 0)) as material_cost,
      sum(component.quantity * coalesce(component_item.labor_cost, 0)) as labor_cost
    from public.cost_item_components component
    join public.cost_items component_item
      on component_item.id = component.component_cost_item_id
    where component.company_id = active_company_id
    group by component.assembly_cost_item_id
  ) as rollup
  where assembly_item.id = rollup.assembly_cost_item_id;

  get diagnostics imported_item_count = row_count;
  imported_recipe_count := (select count(*) from temp_import_recipes);

  return jsonb_build_object(
    'importedItemCount',
    (select count(*) from temp_import_items),
    'importedRecipeCount',
    imported_recipe_count,
    'clearedExisting',
    clear_existing
  );
end;
$$;
revoke all on function public.admin_import_cost_library(jsonb, jsonb, boolean) from public;
grant execute on function public.admin_import_cost_library(jsonb, jsonb, boolean) to authenticated;
-- Source: project-files-classification-setup.sql (last modified 2026-03-23 17:44:24)
alter table public.project_files
add column if not exists classification text,
add column if not exists classification_confidence text,
add column if not exists classification_source text default 'heuristic',
add column if not exists needs_review boolean not null default false,
add column if not exists sheet_number text,
add column if not exists extracted_title text,
add column if not exists sheet_title text;
create index if not exists project_files_classification_idx
on public.project_files(project_id, classification);
-- Source: bid-rows-scope-workflow-setup.sql (last modified 2026-03-24 13:44:03)
alter table public.bid_rows
add column if not exists qty_type text not null default 'fixed',
add column if not exists description text,
add column if not exists spec_text text;
create index if not exists bid_rows_qty_type_idx
on public.bid_rows(project_id, qty_type);
alter table public.bid_rows
drop constraint if exists bid_rows_qty_type_check;
alter table public.bid_rows
add constraint bid_rows_qty_type_check
check (qty_type in ('fixed', 'per'));
-- Source: bid-rows-supplier-scope-setup.sql (last modified 2026-03-24 14:02:35)
alter table public.bid_rows
add column if not exists include_in_supplier_scope boolean not null default true;
create index if not exists bid_rows_supplier_scope_idx
on public.bid_rows(project_id, include_in_supplier_scope);
update public.bid_rows
set include_in_supplier_scope = false
where lower(section) in (
  'demolition / existing plumbing removal',
  'sawcut / trenching / backfill',
  'testing / inspections / closeout'
);
update public.bid_rows
set include_in_supplier_scope = false
where lower(coalesce(description, '')) like '%internal%'
   or lower(coalesce(description, '')) like '%coordination%'
   or lower(coalesce(section, '')) like '%coordination%'
   or lower(coalesce(section, '')) like '%closeout%'
   or lower(coalesce(section, '')) like '%inspection%';
-- Source: bid-supplier-items-setup.sql (last modified 2026-03-24 14:15:12)
create table if not exists public.bid_supplier_items (
  id uuid primary key default gen_random_uuid(),
  bid_row_id uuid not null references public.bid_rows(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  supplier_group text,
  sort_order integer,
  qty text,
  qty_type text not null default 'fixed',
  description text not null,
  spec_text text,
  brand_text text,
  notes text,
  include_in_supplier_scope boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists bid_supplier_items_project_id_idx
on public.bid_supplier_items(project_id);
create index if not exists bid_supplier_items_bid_row_id_idx
on public.bid_supplier_items(bid_row_id);
create index if not exists bid_supplier_items_sort_order_idx
on public.bid_supplier_items(project_id, sort_order);
alter table public.bid_supplier_items
drop constraint if exists bid_supplier_items_qty_type_check;
alter table public.bid_supplier_items
add constraint bid_supplier_items_qty_type_check
check (qty_type in ('fixed', 'per'));
alter table public.bid_supplier_items enable row level security;
drop policy if exists "bid_supplier_items select own company" on public.bid_supplier_items;
drop policy if exists "bid_supplier_items insert own company" on public.bid_supplier_items;
drop policy if exists "bid_supplier_items update own company" on public.bid_supplier_items;
drop policy if exists "bid_supplier_items delete own company" on public.bid_supplier_items;
create policy "bid_supplier_items select own company"
on public.bid_supplier_items
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = bid_supplier_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_supplier_items insert own company"
on public.bid_supplier_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = bid_supplier_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_supplier_items update own company"
on public.bid_supplier_items
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = bid_supplier_items.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = bid_supplier_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "bid_supplier_items delete own company"
on public.bid_supplier_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = bid_supplier_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
-- Source: scope-extraction-candidates-setup.sql (last modified 2026-03-24 16:10:17)
create table if not exists public.scope_extraction_candidates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_file_id uuid not null references public.project_files(id) on delete cascade,
  candidate_type text not null default 'general',
  candidate_source text not null default 'schedule',
  parent_bid_row_id uuid references public.bid_rows(id) on delete set null,
  imported_supplier_item_id uuid references public.bid_supplier_items(id) on delete set null,
  supplier_group text,
  qty text,
  qty_type text not null default 'fixed',
  description text not null,
  spec_text text,
  brand_text text,
  source_excerpt text,
  confidence text not null default 'LOW',
  needs_review boolean not null default true,
  review_reason text,
  is_imported boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.scope_extraction_candidates
add column if not exists candidate_type text not null default 'general';
alter table public.scope_extraction_candidates
add column if not exists candidate_source text not null default 'schedule';
alter table public.scope_extraction_candidates
add column if not exists source_excerpt text;
create index if not exists scope_extraction_candidates_project_id_idx
on public.scope_extraction_candidates(project_id);
create index if not exists scope_extraction_candidates_source_file_id_idx
on public.scope_extraction_candidates(source_file_id);
create index if not exists scope_extraction_candidates_parent_bid_row_id_idx
on public.scope_extraction_candidates(parent_bid_row_id);
create index if not exists scope_extraction_candidates_needs_review_idx
on public.scope_extraction_candidates(project_id, needs_review, is_imported);
alter table public.scope_extraction_candidates
drop constraint if exists scope_extraction_candidates_qty_type_check;
alter table public.scope_extraction_candidates
add constraint scope_extraction_candidates_qty_type_check
check (qty_type in ('fixed', 'per'));
alter table public.scope_extraction_candidates
drop constraint if exists scope_extraction_candidates_confidence_check;
alter table public.scope_extraction_candidates
add constraint scope_extraction_candidates_confidence_check
check (confidence in ('HIGH', 'MEDIUM', 'LOW'));
alter table public.scope_extraction_candidates
drop constraint if exists scope_extraction_candidates_candidate_source_check;
alter table public.scope_extraction_candidates
add constraint scope_extraction_candidates_candidate_source_check
check (candidate_source in ('schedule', 'plan_inferred'));
alter table public.scope_extraction_candidates enable row level security;
drop policy if exists "scope_extraction_candidates select own company" on public.scope_extraction_candidates;
drop policy if exists "scope_extraction_candidates insert own company" on public.scope_extraction_candidates;
drop policy if exists "scope_extraction_candidates update own company" on public.scope_extraction_candidates;
drop policy if exists "scope_extraction_candidates delete own company" on public.scope_extraction_candidates;
create policy "scope_extraction_candidates select own company"
on public.scope_extraction_candidates
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = scope_extraction_candidates.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "scope_extraction_candidates insert own company"
on public.scope_extraction_candidates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = scope_extraction_candidates.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "scope_extraction_candidates update own company"
on public.scope_extraction_candidates
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = scope_extraction_candidates.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = scope_extraction_candidates.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "scope_extraction_candidates delete own company"
on public.scope_extraction_candidates
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = scope_extraction_candidates.project_id
      and projects.company_id = public.current_company_id()
  )
);
-- Source: project-inferred-scope-items-setup.sql (last modified 2026-03-25 15:19:02)
create table if not exists public.project_inferred_scope_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  normalized_item_type text not null,
  display_name text not null,
  supplier_group text,
  parent_bid_row_id uuid references public.bid_rows(id) on delete set null,
  inferred_qty integer,
  qty_source_type text not null default 'mention_only',
  confidence text not null default 'LOW',
  source_file_count integer not null default 0,
  source_candidate_count integer not null default 0,
  source_examples text[] not null default '{}',
  source_explanation text not null default '',
  unit_cluster_id text,
  unit_cluster_file_count integer,
  inferred_unit_count integer,
  items_per_unit integer,
  example_source_files text[] not null default '{}',
  imported_supplier_item_id uuid references public.bid_supplier_items(id) on delete set null,
  needs_review boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.project_inferred_scope_items
add column if not exists source_examples text[] not null default '{}';
alter table public.project_inferred_scope_items
add column if not exists source_explanation text not null default '';
alter table public.project_inferred_scope_items
add column if not exists unit_cluster_id text;
alter table public.project_inferred_scope_items
add column if not exists unit_cluster_file_count integer;
alter table public.project_inferred_scope_items
add column if not exists inferred_unit_count integer;
alter table public.project_inferred_scope_items
add column if not exists items_per_unit integer;
alter table public.project_inferred_scope_items
add column if not exists example_source_files text[] not null default '{}';
create index if not exists project_inferred_scope_items_project_id_idx
on public.project_inferred_scope_items(project_id);
create index if not exists project_inferred_scope_items_parent_bid_row_id_idx
on public.project_inferred_scope_items(parent_bid_row_id);
create unique index if not exists project_inferred_scope_items_project_item_idx
on public.project_inferred_scope_items(project_id, normalized_item_type);
alter table public.project_inferred_scope_items
drop constraint if exists project_inferred_scope_items_qty_source_type_check;
alter table public.project_inferred_scope_items
add constraint project_inferred_scope_items_qty_source_type_check
check (
  qty_source_type in (
    'direct_schedule',
    'direct_plan',
    'repeated_inference',
    'mention_only',
    'manual_override'
  )
);
alter table public.project_inferred_scope_items
drop constraint if exists project_inferred_scope_items_confidence_check;
alter table public.project_inferred_scope_items
add constraint project_inferred_scope_items_confidence_check
check (confidence in ('HIGH', 'MEDIUM', 'LOW'));
alter table public.project_inferred_scope_items enable row level security;
drop policy if exists "project_inferred_scope_items select own company" on public.project_inferred_scope_items;
drop policy if exists "project_inferred_scope_items insert own company" on public.project_inferred_scope_items;
drop policy if exists "project_inferred_scope_items update own company" on public.project_inferred_scope_items;
drop policy if exists "project_inferred_scope_items delete own company" on public.project_inferred_scope_items;
create policy "project_inferred_scope_items select own company"
on public.project_inferred_scope_items
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_inferred_scope_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_inferred_scope_items insert own company"
on public.project_inferred_scope_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_inferred_scope_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_inferred_scope_items update own company"
on public.project_inferred_scope_items
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_inferred_scope_items.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_inferred_scope_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_inferred_scope_items delete own company"
on public.project_inferred_scope_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_inferred_scope_items.project_id
      and projects.company_id = public.current_company_id()
  )
);
-- Source: project-unit-analysis-setup.sql (last modified 2026-03-26 09:26:47)
create table if not exists public.project_unit_analysis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_file_id uuid references public.project_files(id) on delete cascade,
  unit_type text not null,
  raw_label text,
  normalized_candidate text,
  bedrooms integer,
  bathrooms integer,
  unit_count integer not null,
  section_context text not null default 'other',
  source_type text not null default 'ocr',
  confidence text not null default 'LOW',
  mapping_status text not null default 'unmatched',
  mapping_explanation text,
  source_excerpt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_unit_analysis_project_id_idx
on public.project_unit_analysis(project_id);
create index if not exists project_unit_analysis_source_file_id_idx
on public.project_unit_analysis(source_file_id);
create index if not exists project_unit_analysis_project_source_file_idx
on public.project_unit_analysis(project_id, source_file_id);
alter table public.project_unit_analysis
drop constraint if exists project_unit_analysis_section_context_check;
alter table public.project_unit_analysis
add constraint project_unit_analysis_section_context_check
check (section_context in ('dwelling_units', 'parking', 'open_garage', 'other'));
alter table public.project_unit_analysis
drop constraint if exists project_unit_analysis_source_type_check;
alter table public.project_unit_analysis
add constraint project_unit_analysis_source_type_check
check (source_type in ('schedule', 'plan', 'ocr'));
alter table public.project_unit_analysis
drop constraint if exists project_unit_analysis_confidence_check;
alter table public.project_unit_analysis
add constraint project_unit_analysis_confidence_check
check (confidence in ('HIGH', 'MEDIUM', 'LOW'));
alter table public.project_unit_analysis
drop constraint if exists project_unit_analysis_mapping_status_check;
alter table public.project_unit_analysis
add constraint project_unit_analysis_mapping_status_check
check (mapping_status in ('confirmed', 'ambiguous', 'unmatched'));
alter table public.project_unit_analysis enable row level security;
drop policy if exists "project_unit_analysis select own company" on public.project_unit_analysis;
drop policy if exists "project_unit_analysis insert own company" on public.project_unit_analysis;
drop policy if exists "project_unit_analysis update own company" on public.project_unit_analysis;
drop policy if exists "project_unit_analysis delete own company" on public.project_unit_analysis;
create policy "project_unit_analysis select own company"
on public.project_unit_analysis
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_unit_analysis.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_unit_analysis insert own company"
on public.project_unit_analysis
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_unit_analysis.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_unit_analysis update own company"
on public.project_unit_analysis
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_unit_analysis.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_unit_analysis.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_unit_analysis delete own company"
on public.project_unit_analysis
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_unit_analysis.project_id
      and projects.company_id = public.current_company_id()
  )
);
-- Source: project-manual-unit-mix-setup.sql (last modified 2026-03-29 10:58:59)
create table if not exists public.project_manual_unit_mix (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  unit_type text not null,
  unit_count integer not null,
  explanation text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists project_manual_unit_mix_project_id_idx
on public.project_manual_unit_mix(project_id);
create unique index if not exists project_manual_unit_mix_project_unit_type_idx
on public.project_manual_unit_mix(project_id, unit_type);
alter table public.project_manual_unit_mix enable row level security;
drop policy if exists "project_manual_unit_mix select own company" on public.project_manual_unit_mix;
drop policy if exists "project_manual_unit_mix insert own company" on public.project_manual_unit_mix;
drop policy if exists "project_manual_unit_mix update own company" on public.project_manual_unit_mix;
drop policy if exists "project_manual_unit_mix delete own company" on public.project_manual_unit_mix;
create policy "project_manual_unit_mix select own company"
on public.project_manual_unit_mix
for select
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_manual_unit_mix.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_manual_unit_mix insert own company"
on public.project_manual_unit_mix
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_manual_unit_mix.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_manual_unit_mix update own company"
on public.project_manual_unit_mix
for update
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_manual_unit_mix.project_id
      and projects.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects
    where projects.id = project_manual_unit_mix.project_id
      and projects.company_id = public.current_company_id()
  )
);
create policy "project_manual_unit_mix delete own company"
on public.project_manual_unit_mix
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects
    where projects.id = project_manual_unit_mix.project_id
      and projects.company_id = public.current_company_id()
  )
);
-- Source: project-unit-analysis-subtypes-setup.sql (last modified 2026-04-02 09:19:35)
alter table public.project_unit_analysis
add column if not exists family_label text,
add column if not exists subtype_label text,
add column if not exists area_sqft integer,
add column if not exists area_label text,
add column if not exists group_total_units integer;
create index if not exists project_unit_analysis_family_label_idx
on public.project_unit_analysis(project_id, family_label);
-- Source: field-bridge-setup.sql (last modified 2026-03-30 18:07:15)
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  phone_number text not null,
  email text,
  role text,
  preferred_language text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_preferred_language_check
    check (preferred_language in ('en', 'es'))
);
create unique index if not exists contacts_project_phone_unique_idx
on public.contacts(project_id, phone_number);
create index if not exists contacts_project_id_idx
on public.contacts(project_id);
create table if not exists public.broadcasts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  original_text text not null,
  audience_type text not null,
  created_at timestamptz not null default now(),
  constraint broadcasts_audience_type_check
    check (audience_type in ('assigned', 'all_contacts', 'custom'))
);
create index if not exists broadcasts_project_id_idx
on public.broadcasts(project_id);
create table if not exists public.field_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  bid_row_id uuid not null references public.bid_rows(id) on delete cascade,
  description text not null,
  assigned_to uuid references public.contacts(id) on delete set null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint field_tasks_status_check
    check (status in ('pending', 'started', 'blocked', 'complete'))
);
create unique index if not exists field_tasks_bid_row_id_unique_idx
on public.field_tasks(bid_row_id);
create index if not exists field_tasks_project_id_idx
on public.field_tasks(project_id);
create index if not exists field_tasks_assigned_to_idx
on public.field_tasks(assigned_to);
create table if not exists public.communication_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.field_tasks(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  direction text not null,
  raw_text text,
  translated_text text,
  media_url text,
  media_analysis text,
  delivery_status text not null default 'sent',
  provider_message_id text,
  broadcast_id uuid references public.broadcasts(id) on delete set null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint communication_logs_direction_check
    check (direction in ('in', 'out')),
  constraint communication_logs_delivery_status_check
    check (delivery_status in ('queued', 'sent', 'delivered', 'read', 'failed', 'received'))
);
create unique index if not exists communication_logs_provider_message_id_unique_idx
on public.communication_logs(provider_message_id)
where provider_message_id is not null;
create index if not exists communication_logs_project_id_idx
on public.communication_logs(project_id);
create index if not exists communication_logs_task_id_idx
on public.communication_logs(task_id);
create index if not exists communication_logs_contact_id_idx
on public.communication_logs(contact_id);
alter table public.contacts enable row level security;
alter table public.broadcasts enable row level security;
alter table public.field_tasks enable row level security;
alter table public.communication_logs enable row level security;
create or replace function public.set_contacts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_contacts_updated_at on public.contacts;
create trigger set_contacts_updated_at
before update on public.contacts
for each row
execute function public.set_contacts_updated_at();
create or replace function public.set_field_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_field_tasks_updated_at on public.field_tasks;
create trigger set_field_tasks_updated_at
before update on public.field_tasks
for each row
execute function public.set_field_tasks_updated_at();
drop policy if exists "contacts select own company" on public.contacts;
drop policy if exists "contacts insert own company" on public.contacts;
drop policy if exists "contacts update own company" on public.contacts;
drop policy if exists "contacts delete own company" on public.contacts;
create policy "contacts select own company"
on public.contacts
for select
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = contacts.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "contacts insert own company"
on public.contacts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects project
    where project.id = contacts.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "contacts update own company"
on public.contacts
for update
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = contacts.project_id
      and project.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects project
    where project.id = contacts.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "contacts delete own company"
on public.contacts
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = contacts.project_id
      and project.company_id = public.current_company_id()
  )
);
drop policy if exists "broadcasts select own company" on public.broadcasts;
drop policy if exists "broadcasts insert own company" on public.broadcasts;
drop policy if exists "broadcasts update own company" on public.broadcasts;
drop policy if exists "broadcasts delete own company" on public.broadcasts;
create policy "broadcasts select own company"
on public.broadcasts
for select
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = broadcasts.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "broadcasts insert own company"
on public.broadcasts
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects project
    where project.id = broadcasts.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "broadcasts update own company"
on public.broadcasts
for update
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = broadcasts.project_id
      and project.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects project
    where project.id = broadcasts.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "broadcasts delete own company"
on public.broadcasts
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = broadcasts.project_id
      and project.company_id = public.current_company_id()
  )
);
drop policy if exists "field_tasks select own company" on public.field_tasks;
drop policy if exists "field_tasks insert own company" on public.field_tasks;
drop policy if exists "field_tasks update own company" on public.field_tasks;
drop policy if exists "field_tasks delete own company" on public.field_tasks;
create policy "field_tasks select own company"
on public.field_tasks
for select
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = field_tasks.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "field_tasks insert own company"
on public.field_tasks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects project
    where project.id = field_tasks.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "field_tasks update own company"
on public.field_tasks
for update
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = field_tasks.project_id
      and project.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects project
    where project.id = field_tasks.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "field_tasks delete own company"
on public.field_tasks
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = field_tasks.project_id
      and project.company_id = public.current_company_id()
  )
);
drop policy if exists "communication_logs select own company" on public.communication_logs;
drop policy if exists "communication_logs insert own company" on public.communication_logs;
drop policy if exists "communication_logs update own company" on public.communication_logs;
drop policy if exists "communication_logs delete own company" on public.communication_logs;
create policy "communication_logs select own company"
on public.communication_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = communication_logs.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "communication_logs insert own company"
on public.communication_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects project
    where project.id = communication_logs.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "communication_logs update own company"
on public.communication_logs
for update
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = communication_logs.project_id
      and project.company_id = public.current_company_id()
  )
)
with check (
  exists (
    select 1
    from public.projects project
    where project.id = communication_logs.project_id
      and project.company_id = public.current_company_id()
  )
);
create policy "communication_logs delete own company"
on public.communication_logs
for delete
to authenticated
using (
  exists (
    select 1
    from public.projects project
    where project.id = communication_logs.project_id
      and project.company_id = public.current_company_id()
  )
);
-- Source: sheet-extraction-credits-setup.sql (last modified 2026-03-31 09:35:26)
alter table public.projects
add column if not exists sheets_extracted_count integer not null default 0;
alter table public.companies
add column if not exists total_lifetime_sheets integer not null default 0;
drop policy if exists "companies update own company" on public.companies;
create policy "companies update own company"
on public.companies
for update
to authenticated
using (id = public.current_company_id())
with check (id = public.current_company_id());
-- Source: subscription-gate-setup.sql (last modified 2026-03-31 17:16:28)
alter table public.companies
add column if not exists subscription_status text not null default 'trialing';
alter table public.companies
add column if not exists trial_ends_at timestamptz;
alter table public.companies
drop constraint if exists companies_subscription_status_check;
alter table public.companies
add constraint companies_subscription_status_check
check (subscription_status in ('internal', 'tester', 'active', 'trialing', 'past_due'));
update public.companies
set trial_ends_at = coalesce(trial_ends_at, created_at + interval '14 days')
where trial_ends_at is null;
create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  company_name text not null,
  access_type text not null default 'tester'
    check (access_type in ('tester')),
  created_by_company_id uuid not null references public.companies(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_company_id uuid references public.companies(id) on delete set null,
  redeemed_by_user_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  redeemed_at timestamptz,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists invite_codes_created_by_company_id_idx
  on public.invite_codes(created_by_company_id);
create index if not exists invite_codes_redeemed_at_idx
  on public.invite_codes(redeemed_at);
create or replace function public.current_company_subscription_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select subscription_status
  from public.companies
  where id = public.current_company_id()
$$;
grant execute on function public.current_company_subscription_status() to authenticated;
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  generated_company_name text;
  normalized_invite_code text;
  invited_company_name text;
  invited_access_type text;
  resolved_subscription_status text := 'trialing';
  resolved_trial_ends_at timestamptz := now() + interval '14 days';
begin
  normalized_invite_code := upper(nullif(new.raw_user_meta_data ->> 'invite_code', ''));

  if normalized_invite_code is not null then
    select company_name, access_type
    into invited_company_name, invited_access_type
    from public.invite_codes
    where code = normalized_invite_code
      and disabled = false
      and redeemed_at is null
      and (expires_at is null or expires_at > now())
    limit 1;

    if invited_access_type = 'tester' then
      resolved_subscription_status := 'tester';
      resolved_trial_ends_at := now() + interval '14 days';
    end if;
  end if;

  generated_company_name :=
    coalesce(
      nullif(new.raw_user_meta_data ->> 'company_name', ''),
      nullif(invited_company_name, ''),
      split_part(coalesce(new.email, 'new-company'), '@', 1) || ' Company'
    );

  insert into public.companies (name, subscription_status, trial_ends_at)
  values (generated_company_name, resolved_subscription_status, resolved_trial_ends_at)
  returning id into new_company_id;

  insert into public.profiles (id, company_id, email)
  values (new.id, new_company_id, new.email);

  if normalized_invite_code is not null and invited_access_type = 'tester' then
    update public.invite_codes
    set redeemed_at = now(),
        redeemed_by_user_id = new.id,
        redeemed_company_id = new_company_id
    where code = normalized_invite_code
      and redeemed_at is null;
  end if;

  return new;
end;
$$;
alter table public.invite_codes enable row level security;
drop policy if exists "companies update own company" on public.companies;
drop policy if exists "invite_codes select internal" on public.invite_codes;
drop policy if exists "invite_codes insert internal" on public.invite_codes;
drop policy if exists "invite_codes update internal" on public.invite_codes;
drop policy if exists "invite_codes delete internal" on public.invite_codes;
create policy "companies update own company"
on public.companies
for update
to authenticated
using (id = public.current_company_id())
with check (id = public.current_company_id());
create policy "invite_codes select internal"
on public.invite_codes
for select
to authenticated
using (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
);
create policy "invite_codes insert internal"
on public.invite_codes
for insert
to authenticated
with check (
  created_by_company_id = public.current_company_id()
  and created_by_user_id = auth.uid()
  and public.current_company_subscription_status() = 'internal'
);
create policy "invite_codes update internal"
on public.invite_codes
for update
to authenticated
using (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
)
with check (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
);
create policy "invite_codes delete internal"
on public.invite_codes
for delete
to authenticated
using (
  created_by_company_id = public.current_company_id()
  and public.current_company_subscription_status() = 'internal'
);
-- Source: company-trial-admin-view.sql (last modified 2026-03-31 16:36:59)
drop view if exists public.company_trial_admin_metrics;
create or replace view public.company_trial_admin_metrics as
with project_stats as (
  select
    project.company_id,
    count(project.id) as project_count,
    coalesce(sum(project.sheets_extracted_count), 0) as extracted_sheets
  from public.projects project
  group by project.company_id
),
upload_stats as (
  select
    project.company_id,
    count(project_file.id) as uploaded_sheets
  from public.projects project
  left join public.project_files project_file
    on project_file.project_id = project.id
  group by project.company_id
)
select
  company.id as company_id,
  company.name as company_name,
  company.created_at as company_created_at,
  company.subscription_status,
  company.trial_ends_at,
  company.subscription_status = 'trialing'
    and company.trial_ends_at is not null
    and now() < company.trial_ends_at as in_14_day_trial,
  greatest(
    0,
    ceil(extract(epoch from (coalesce(company.trial_ends_at, now()) - now())) / 86400.0)
  )::integer as trial_days_remaining,
  coalesce(project_stats.project_count, 0)::integer as project_count,
  coalesce(upload_stats.uploaded_sheets, 0)::integer as uploaded_sheets,
  coalesce(project_stats.extracted_sheets, 0)::integer as extracted_sheets,
  company.total_lifetime_sheets::integer as total_lifetime_sheets,
  case
    when coalesce(upload_stats.uploaded_sheets, 0) = 0 then 0::numeric
    else round(
      coalesce(project_stats.extracted_sheets, 0)::numeric /
      nullif(upload_stats.uploaded_sheets, 0)::numeric,
      3
    )
  end as extracted_to_uploaded_ratio,
  greatest(
    coalesce(upload_stats.uploaded_sheets, 0) - coalesce(project_stats.extracted_sheets, 0),
    0
  )::integer as filtered_noise_sheets
from public.companies company
left join project_stats
  on project_stats.company_id = company.id
left join upload_stats
  on upload_stats.company_id = company.id
order by company.created_at desc;
-- Source: coordinator-leads-setup.sql (last modified 2026-03-31 18:48:49)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  company_name text,
  source_surface text not null default 'marketing_coordinator',
  lead_status text not null default 'new',
  requested_vip_invite boolean not null default false,
  last_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_source_surface_check
    check (source_surface in ('marketing_coordinator', 'product_coordinator')),
  constraint leads_lead_status_check
    check (lead_status in ('new', 'contacted', 'converted', 'archived'))
);
create unique index if not exists leads_email_unique_idx
  on public.leads (lower(email));
create or replace function public.set_leads_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at
before update on public.leads
for each row
execute function public.set_leads_updated_at();
alter table public.leads enable row level security;
drop policy if exists "leads select internal" on public.leads;
drop policy if exists "leads update internal" on public.leads;
drop policy if exists "leads delete internal" on public.leads;
create policy "leads select internal"
on public.leads
for select
to authenticated
using (public.current_company_subscription_status() = 'internal');
create policy "leads update internal"
on public.leads
for update
to authenticated
using (public.current_company_subscription_status() = 'internal')
with check (public.current_company_subscription_status() = 'internal');
create policy "leads delete internal"
on public.leads
for delete
to authenticated
using (public.current_company_subscription_status() = 'internal');
-- Source: stripe-pro-seats-setup.sql (last modified 2026-04-01 10:57:53)
alter table public.companies
add column if not exists stripe_customer_id text,
add column if not exists stripe_subscription_id text,
add column if not exists stripe_base_subscription_item_id text,
add column if not exists stripe_seat_subscription_item_id text,
add column if not exists plan_type text;
alter table public.companies
drop constraint if exists companies_plan_type_check;
alter table public.companies
add constraint companies_plan_type_check
check (plan_type is null or plan_type in ('pro'));
update public.companies
set plan_type = 'pro'
where subscription_status = 'active'
  and plan_type is null;
create index if not exists companies_stripe_customer_id_idx
on public.companies(stripe_customer_id);
create index if not exists companies_stripe_subscription_id_idx
on public.companies(stripe_subscription_id);
-- Source: project-review-progress-setup.sql (last modified 2026-04-02 08:09:46)
alter table public.projects
add column if not exists last_completed_step text,
add column if not exists review_progress integer not null default 0;
alter table public.projects
drop constraint if exists projects_last_completed_step_check;
alter table public.projects
add constraint projects_last_completed_step_check
check (
  last_completed_step is null
  or last_completed_step in ('classify', 'count-units', 'define-scope', 'final-bid')
);
alter table public.projects
drop constraint if exists projects_review_progress_check;
alter table public.projects
add constraint projects_review_progress_check
check (review_progress >= 0 and review_progress <= 100);
create index if not exists projects_last_completed_step_idx
on public.projects(last_completed_step);
-- Source: project-conditions-setup.sql (last modified 2026-04-02 19:30:21)
alter table public.projects
add column if not exists concrete_pt_slab_construction boolean not null default false;
