alter table public.ingredients
  add column if not exists msnf_pct numeric(6,2),
  add column if not exists dosage_guideline_per_kg numeric(8,2),
  add column if not exists created_at timestamp with time zone default current_timestamp;
update public.ingredients
set
  msnf_pct = coalesce(msnf_pct, solids_non_fat_pct),
  dosage_guideline_per_kg = coalesce(dosage_guideline_per_kg, dosage_guideline)
where msnf_pct is null
   or dosage_guideline_per_kg is null;
alter table public.ingredients
  drop constraint if exists ingredients_category_check;
alter table public.ingredients
  add constraint ingredients_category_check
  check (
    category in (
      'Dairy',
      'Sugar',
      'Base/Stabilizer',
      'Flavor Paste',
      'Other',
      'Base',
      'Nut',
      'Chocolate'
    )
  );
