alter table public.ingredients
  add column if not exists total_solids_pct numeric(6,2),
  add column if not exists is_base_ingredient boolean not null default true,
  add column if not exists dosage_guideline numeric(8,2),
  add column if not exists pdf_url text;
update public.ingredients
set total_solids_pct = coalesce(
  total_solids_pct,
  fat_pct + sugar_pct + solids_non_fat_pct + other_solids_pct
)
where total_solids_pct is null;
insert into storage.buckets (id, name, public)
values ('ingredient-tech-sheets', 'ingredient-tech-sheets', true)
on conflict (id) do nothing;
drop policy if exists "ingredient_tech_sheets_public_read" on storage.objects;
create policy "ingredient_tech_sheets_public_read"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'ingredient-tech-sheets');
drop policy if exists "ingredient_tech_sheets_authenticated_insert" on storage.objects;
create policy "ingredient_tech_sheets_authenticated_insert"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'ingredient-tech-sheets');
drop policy if exists "ingredient_tech_sheets_authenticated_update" on storage.objects;
create policy "ingredient_tech_sheets_authenticated_update"
  on storage.objects
  for update
  to authenticated
  using (bucket_id = 'ingredient-tech-sheets')
  with check (bucket_id = 'ingredient-tech-sheets');
