create extension if not exists pg_trgm;
create table if not exists wrestling.match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  athlete_a_id uuid not null references wrestling.profiles (id) on delete cascade,
  athlete_b_id uuid not null references wrestling.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'complete', 'error')),
  report_text text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists match_predictions_user_id_created_at_idx
  on wrestling.match_predictions (user_id, created_at desc);
create index if not exists match_predictions_status_created_at_idx
  on wrestling.match_predictions (status, created_at desc);
create index if not exists profiles_full_name_trgm_idx
  on wrestling.profiles
  using gin (lower(full_name) gin_trgm_ops);
create index if not exists profiles_unified_score_desc_idx
  on wrestling.profiles (unified_score desc, full_name asc);
alter table wrestling.match_predictions enable row level security;
drop policy if exists "Users can view their own match predictions" on wrestling.match_predictions;
create policy "Users can view their own match predictions"
on wrestling.match_predictions
for select
to authenticated
using (auth.uid() = user_id);
drop policy if exists "Users can insert their own match predictions" on wrestling.match_predictions;
create policy "Users can insert their own match predictions"
on wrestling.match_predictions
for insert
to authenticated
with check (auth.uid() = user_id);
create or replace function wrestling.touch_match_prediction_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists touch_match_prediction_updated_at on wrestling.match_predictions;
create trigger touch_match_prediction_updated_at
before update on wrestling.match_predictions
for each row
execute function wrestling.touch_match_prediction_updated_at();
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'wrestling'
      and tablename = 'match_predictions'
  ) then
    alter publication supabase_realtime add table wrestling.match_predictions;
  end if;
end;
$$;
