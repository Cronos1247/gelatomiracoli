create or replace function wrestling.normalize_team_location_key(raw_value text)
returns text
language sql
immutable
as $$
  select nullif(lower(trim(regexp_replace(coalesce(raw_value, ''), '\s+', ' ', 'g'))), '');
$$;
create table if not exists wrestling.team_locations (
  team_name text primary key,
  state_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_locations_state_code_check
    check (state_code = 'UNKNOWN' or state_code ~ '^[A-Z]{2}$')
);
create index if not exists team_locations_state_code_idx
  on wrestling.team_locations (state_code);
grant select, insert, update, delete on wrestling.team_locations to service_role;
create or replace function wrestling.touch_team_location_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists touch_team_location_updated_at on wrestling.team_locations;
create trigger touch_team_location_updated_at
before update on wrestling.team_locations
for each row
execute function wrestling.touch_team_location_updated_at();
create or replace function wrestling.apply_team_location_state()
returns trigger
language plpgsql
as $$
declare
  normalized_school text;
  normalized_club text;
  school_state text;
  club_state text;
begin
  if nullif(btrim(coalesce(new.state, '')), '') is not null
     and lower(btrim(new.state)) not in ('tbd', 'unknown', 'state tbd', 'n/a', 'na') then
    return new;
  end if;

  normalized_school := wrestling.normalize_team_location_key(new.high_school_name);
  normalized_club := wrestling.normalize_team_location_key(new.club_name);

  if normalized_school is not null then
    select team_locations.state_code
      into school_state
    from wrestling.team_locations
    where team_locations.team_name = normalized_school
      and team_locations.state_code <> 'UNKNOWN'
    limit 1;
  end if;

  if normalized_club is not null then
    select team_locations.state_code
      into club_state
    from wrestling.team_locations
    where team_locations.team_name = normalized_club
      and team_locations.state_code <> 'UNKNOWN'
    limit 1;
  end if;

  if school_state is not null and club_state is not null and school_state <> club_state then
    return new;
  end if;

  new.state := coalesce(school_state, club_state, new.state);
  return new;
end;
$$;
drop trigger if exists apply_team_location_state on wrestling.profiles;
create trigger apply_team_location_state
before insert or update on wrestling.profiles
for each row
execute function wrestling.apply_team_location_state();
