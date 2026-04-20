alter table public.ingredients
  add column if not exists is_master boolean not null default false;
update public.ingredients
set is_master = true
where user_id is null
  and coalesce(is_master, false) = false;
drop view if exists public.combined_pantry;
create view public.combined_pantry
with (security_invoker = true) as
select *
from public.ingredients
where is_master = true

union all

select *
from public.ingredients
where is_master = false
  and (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
  );
drop policy if exists "ingredients_select_global_or_owned" on public.ingredients;
create policy "ingredients_select_master_or_owned"
  on public.ingredients
  for select
  to anon, authenticated
  using (
    is_master = true
    or auth.uid() = user_id
    or (auth.uid() is null and user_id is null and is_master = false)
  );
drop policy if exists "ingredients_insert_owned" on public.ingredients;
create policy "ingredients_insert_master_or_owned"
  on public.ingredients
  for insert
  to authenticated
  with check (
    (is_master = false and auth.uid() = user_id)
    or (is_master = true and auth.role() = 'service_role')
  );
drop policy if exists "ingredients_update_owned" on public.ingredients;
create policy "ingredients_update_owned_only"
  on public.ingredients
  for update
  to authenticated
  using (is_master = false and auth.uid() = user_id)
  with check (is_master = false and auth.uid() = user_id);
drop policy if exists "ingredients_delete_owned" on public.ingredients;
create policy "ingredients_delete_owned_only"
  on public.ingredients
  for delete
  to authenticated
  using (is_master = false and auth.uid() = user_id);
create unique index if not exists ingredients_master_name_idx
  on public.ingredients (lower(name))
  where is_master = true;
