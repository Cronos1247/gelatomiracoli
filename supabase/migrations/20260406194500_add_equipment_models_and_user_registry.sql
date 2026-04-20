create table if not exists public.equipment_models (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  machine_type text not null,
  heating_capability boolean not null default false,
  default_overrun_pct numeric not null default 0,
  max_batch_kg numeric not null default 5,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create unique index if not exists equipment_models_brand_model_idx
  on public.equipment_models (lower(brand), lower(model));
with equipment_model_seed (
  brand,
  model,
  machine_type,
  heating_capability,
  default_overrun_pct,
  max_batch_kg
) as (
  values
    ('Bravo', 'Trittico', 'Vertical/Multi', true, 30, 6),
    ('Carpigiani', 'Labotronic HE', 'Horizontal', false, 25, 5.5),
    ('Cattabriga', 'Effe', 'Vertical', false, 20, 4.75)
),
updated_equipment_models as (
  update public.equipment_models as target
  set
    machine_type = seed.machine_type,
    heating_capability = seed.heating_capability,
    default_overrun_pct = seed.default_overrun_pct,
    max_batch_kg = seed.max_batch_kg
  from equipment_model_seed as seed
  where lower(target.brand) = lower(seed.brand)
    and lower(target.model) = lower(seed.model)
  returning target.id, target.brand, target.model
)
insert into public.equipment_models (
  brand,
  model,
  machine_type,
  heating_capability,
  default_overrun_pct,
  max_batch_kg
)
select
  seed.brand,
  seed.model,
  seed.machine_type,
  seed.heating_capability,
  seed.default_overrun_pct,
  seed.max_batch_kg
from equipment_model_seed as seed
where not exists (
  select 1
  from updated_equipment_models as target
  where lower(target.brand) = lower(seed.brand)
    and lower(target.model) = lower(seed.model)
);
create table if not exists public.user_equipment (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  equipment_model_id uuid not null references public.equipment_models (id) on delete cascade,
  nickname text null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists user_equipment_user_id_idx on public.user_equipment (user_id);
create index if not exists user_equipment_equipment_model_id_idx on public.user_equipment (equipment_model_id);
