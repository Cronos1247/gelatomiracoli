alter table wrestling.profiles
  add column if not exists commitment_status boolean not null default false,
  add column if not exists graduation_year integer;
update wrestling.profiles
set
  commitment_status = coalesce(is_committed, commitment_status, false),
  graduation_year = coalesce(graduation_year, grad_year)
where commitment_status is distinct from coalesce(is_committed, commitment_status, false)
   or graduation_year is distinct from coalesce(graduation_year, grad_year);
create or replace function wrestling.sync_profile_commitment_fields()
returns trigger
language plpgsql
as $$
begin
  new.commitment_status := coalesce(new.commitment_status, new.is_committed, false);
  new.is_committed := coalesce(new.is_committed, new.commitment_status, false);
  new.graduation_year := coalesce(new.graduation_year, new.grad_year);
  new.grad_year := coalesce(new.grad_year, new.graduation_year);
  return new;
end;
$$;
drop trigger if exists sync_profile_commitment_fields on wrestling.profiles;
create trigger sync_profile_commitment_fields
before insert or update on wrestling.profiles
for each row
execute function wrestling.sync_profile_commitment_fields();
create index if not exists profiles_recruiter_score_idx
  on wrestling.profiles (unified_score desc);
create index if not exists profiles_recruiter_gpa_idx
  on wrestling.profiles (gpa);
create index if not exists profiles_recruiter_grad_year_idx
  on wrestling.profiles (graduation_year);
create index if not exists profiles_recruiter_commitment_idx
  on wrestling.profiles (commitment_status);
create index if not exists profiles_recruiter_state_weight_idx
  on wrestling.profiles (state, weight_class);
create table if not exists wrestling.recruiter_watchlists (
  recruiter_id uuid not null references auth.users (id) on delete cascade,
  athlete_id uuid not null references wrestling.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recruiter_id, athlete_id)
);
create index if not exists recruiter_watchlists_recruiter_created_idx
  on wrestling.recruiter_watchlists (recruiter_id, created_at desc);
alter table wrestling.recruiter_watchlists enable row level security;
grant select, insert, delete on wrestling.recruiter_watchlists to authenticated;
grant select, insert, update, delete on wrestling.recruiter_watchlists to service_role;
drop policy if exists "Recruiters can view their own watchlist" on wrestling.recruiter_watchlists;
create policy "Recruiters can view their own watchlist"
on wrestling.recruiter_watchlists
for select
to authenticated
using (auth.uid() = recruiter_id);
drop policy if exists "Recruiters can insert their own watchlist rows" on wrestling.recruiter_watchlists;
create policy "Recruiters can insert their own watchlist rows"
on wrestling.recruiter_watchlists
for insert
to authenticated
with check (auth.uid() = recruiter_id);
drop policy if exists "Recruiters can delete their own watchlist rows" on wrestling.recruiter_watchlists;
create policy "Recruiters can delete their own watchlist rows"
on wrestling.recruiter_watchlists
for delete
to authenticated
using (auth.uid() = recruiter_id);
