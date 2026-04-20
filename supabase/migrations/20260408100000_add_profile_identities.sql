create table if not exists wrestling.profile_identities (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references wrestling.profiles(id) on delete cascade,
  source_system text not null,
  source_athlete_key text not null,
  source_display_name text not null,
  source_team_name text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_system, source_athlete_key)
);
create index if not exists profile_identities_profile_id_idx
on wrestling.profile_identities (profile_id);
alter table wrestling.profile_identities enable row level security;
insert into wrestling.profile_identities (
  profile_id,
  source_system,
  source_athlete_key,
  source_display_name,
  source_team_name
)
select
  profiles.id,
  'usa_wrestling_id',
  profiles.usa_wrestling_id,
  profiles.full_name,
  null
from wrestling.profiles as profiles
where profiles.usa_wrestling_id is not null
on conflict (source_system, source_athlete_key) do update
set
  profile_id = excluded.profile_id,
  source_display_name = excluded.source_display_name;
