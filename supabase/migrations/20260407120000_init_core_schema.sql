create extension if not exists "pgcrypto";
create schema if not exists wrestling;
grant usage on schema wrestling to anon, authenticated, service_role;
create table if not exists wrestling.profiles (
  id uuid primary key default gen_random_uuid(),
  usa_wrestling_id text unique,
  full_name text not null,
  state text,
  is_claimed boolean not null default false,
  user_id uuid references auth.users (id) on delete set null
);
create table if not exists wrestling.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  tier_multiplier numeric(6,2) not null default 1.0
);
create table if not exists wrestling.matches (
  id uuid primary key default gen_random_uuid(),
  winner_id uuid not null references wrestling.profiles (id) on delete cascade,
  loser_id uuid not null references wrestling.profiles (id) on delete cascade,
  tournament_id uuid not null references wrestling.tournaments (id) on delete cascade,
  style text not null check (style in ('Freestyle', 'Greco')),
  win_method text not null check (win_method in ('Pin', 'Tech Fall', 'Decision')),
  match_date date not null,
  constraint matches_winner_loser_check check (winner_id <> loser_id)
);
grant select on all tables in schema wrestling to anon, authenticated;
grant select, insert, update, delete on all tables in schema wrestling to service_role;
grant update on wrestling.profiles to authenticated;
create index if not exists profiles_user_id_idx on wrestling.profiles (user_id);
create index if not exists matches_winner_id_idx on wrestling.matches (winner_id);
create index if not exists matches_loser_id_idx on wrestling.matches (loser_id);
create index if not exists matches_tournament_id_idx on wrestling.matches (tournament_id);
create index if not exists matches_style_idx on wrestling.matches (style);
create index if not exists matches_match_date_idx on wrestling.matches (match_date);
alter table wrestling.profiles enable row level security;
alter table wrestling.tournaments enable row level security;
alter table wrestling.matches enable row level security;
create or replace function public.calculate_athlete_score(profile_uuid uuid)
returns numeric
language sql
stable
security definer
set search_path = public, wrestling
as $$
  select coalesce(
    sum(
      case m.win_method
        when 'Pin' then 2.0
        when 'Tech Fall' then 1.5
        when 'Decision' then 1.0
        else 0
      end * t.tier_multiplier
    ),
    0
  )
  from wrestling.matches m
  join wrestling.tournaments t on t.id = m.tournament_id
  where m.winner_id = profile_uuid;
$$;
grant execute on function public.calculate_athlete_score(uuid) to anon, authenticated, service_role;
