alter table wrestling.matches
  add column if not exists source_platform text,
  add column if not exists round_name text;
alter table wrestling.matches
  drop constraint if exists matches_source_platform_check;
alter table wrestling.matches
  add constraint matches_source_platform_check
  check (source_platform is null or source_platform in ('flo', 'track', 'admin'));
update wrestling.matches as match_row
set source_platform = case
  when tournament.trackwrestling_event_id is not null then 'track'
  when coalesce(tournament.source_system, '') ilike '%track%' then 'track'
  when coalesce(tournament.source_system, '') ilike '%flo%' then 'flo'
  when coalesce(match_row.source_platform, '') = '' then 'flo'
  else match_row.source_platform
end
from wrestling.tournaments as tournament
where tournament.id = match_row.tournament_id
  and (match_row.source_platform is null or btrim(match_row.source_platform) = '');
create index if not exists matches_source_platform_idx
  on wrestling.matches (source_platform, tournament_id, match_date desc);
create index if not exists matches_round_name_idx
  on wrestling.matches (round_name);
