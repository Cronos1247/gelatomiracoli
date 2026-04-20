alter table wrestling.tournaments
add column if not exists source_system text,
add column if not exists source_event_id text;
create unique index if not exists tournaments_source_identity_key
on wrestling.tournaments (source_system, source_event_id)
where source_event_id is not null;
