alter table public.ingredients
  add column if not exists average_market_cost numeric(10,2);
update public.ingredients
set average_market_cost = coalesce(average_market_cost, cost_per_kg, 0);
create table if not exists public.user_ingredient_costs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  cost_per_kg numeric(10,2) not null default 0,
  currency text not null default 'USD' check (currency in ('USD', 'EUR')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);
create unique index if not exists user_ingredient_costs_user_ingredient_idx
  on public.user_ingredient_costs ((coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid)), ingredient_id);
create or replace function public.set_user_ingredient_costs_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;
drop trigger if exists trg_user_ingredient_costs_updated_at on public.user_ingredient_costs;
create trigger trg_user_ingredient_costs_updated_at
before update on public.user_ingredient_costs
for each row
execute function public.set_user_ingredient_costs_updated_at();
alter table public.user_ingredient_costs enable row level security;
drop policy if exists "user_ingredient_costs_select_owned" on public.user_ingredient_costs;
create policy "user_ingredient_costs_select_owned"
  on public.user_ingredient_costs
  for select
  to anon, authenticated
  using (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
  );
drop policy if exists "user_ingredient_costs_insert_owned" on public.user_ingredient_costs;
create policy "user_ingredient_costs_insert_owned"
  on public.user_ingredient_costs
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
    or auth.role() = 'service_role'
  );
drop policy if exists "user_ingredient_costs_update_owned" on public.user_ingredient_costs;
create policy "user_ingredient_costs_update_owned"
  on public.user_ingredient_costs
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
    or auth.role() = 'service_role'
  )
  with check (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
    or auth.role() = 'service_role'
  );
drop policy if exists "user_ingredient_costs_delete_owned" on public.user_ingredient_costs;
create policy "user_ingredient_costs_delete_owned"
  on public.user_ingredient_costs
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    or (auth.uid() is null and user_id is null)
    or auth.role() = 'service_role'
  );
drop view if exists public.pantry_with_costs;
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
