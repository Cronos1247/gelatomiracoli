alter table public.ingredients
  add column if not exists is_global boolean not null default false,
  add column if not exists is_verified boolean not null default false;

drop view if exists public.pantry_with_costs;
drop view if exists public.combined_pantry;

create view public.combined_pantry
with (security_invoker = true) as
select *
from public.ingredients
where coalesce(is_global, false) = true
   or is_master = true

union all

select *
from public.ingredients
where coalesce(is_global, false) = false
  and is_master = false
  and (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
  );

drop policy if exists "ingredients_select_global_or_owned" on public.ingredients;
drop policy if exists "ingredients_select_master_or_owned" on public.ingredients;
create policy "ingredients_select_global_or_owned"
  on public.ingredients
  for select
  to anon, authenticated
  using (
    coalesce(is_global, false) = true
    or is_master = true
    or auth.uid() = user_id
    or (auth.uid() is null and user_id is null and coalesce(is_global, false) = false and is_master = false)
  );

drop policy if exists "ingredients_insert_master_or_owned" on public.ingredients;
create policy "ingredients_insert_global_or_owned"
  on public.ingredients
  for insert
  to authenticated
  with check (
    (coalesce(is_global, false) = false and is_master = false and auth.uid() = user_id)
    or ((coalesce(is_global, false) = true or is_master = true) and auth.role() = 'service_role')
  );

drop policy if exists "ingredients_update_owned_only" on public.ingredients;
create policy "ingredients_update_owned_only"
  on public.ingredients
  for update
  to authenticated
  using (coalesce(is_global, false) = false and is_master = false and auth.uid() = user_id)
  with check (coalesce(is_global, false) = false and is_master = false and auth.uid() = user_id);

drop policy if exists "ingredients_delete_owned_only" on public.ingredients;
create policy "ingredients_delete_owned_only"
  on public.ingredients
  for delete
  to authenticated
  using (coalesce(is_global, false) = false and is_master = false and auth.uid() = user_id);

create view public.pantry_with_costs
with (security_invoker = true) as
select
  pantry.*,
  costs.id as user_cost_id,
  costs.cost_per_kg as user_cost_per_kg,
  coalesce(costs.currency, 'USD') as currency,
  (costs.id is not null) as has_user_cost,
  coalesce(costs.cost_per_kg, 0) as effective_cost_per_kg
from public.combined_pantry pantry
left join public.user_ingredient_costs costs
  on costs.ingredient_id = pantry.id
 and (
   costs.user_id = auth.uid()
   or (auth.uid() is null and costs.user_id is null)
 );
