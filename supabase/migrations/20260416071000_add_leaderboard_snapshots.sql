create table if not exists wrestling.leaderboard_snapshots (
  cache_key text primary key,
  gender text not null check (gender in ('Male', 'Female')),
  style text not null check (style in ('All Styles', 'Freestyle', 'Greco', 'Folkstyle')),
  ranking_pool text not null check (ranking_pool in ('default', 'all')),
  division_filters text[] not null default '{}',
  athlete_count integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
create index if not exists leaderboard_snapshots_generated_at_idx
  on wrestling.leaderboard_snapshots (generated_at desc);
create index if not exists leaderboard_snapshots_lookup_idx
  on wrestling.leaderboard_snapshots (gender, style, ranking_pool);
create or replace function wrestling.set_leaderboard_snapshot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;
drop trigger if exists leaderboard_snapshots_set_updated_at
  on wrestling.leaderboard_snapshots;
create trigger leaderboard_snapshots_set_updated_at
before update on wrestling.leaderboard_snapshots
for each row
execute function wrestling.set_leaderboard_snapshot_updated_at();
