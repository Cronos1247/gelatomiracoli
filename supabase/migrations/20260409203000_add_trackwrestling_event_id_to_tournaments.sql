alter table wrestling.tournaments
add column if not exists trackwrestling_event_id text;
create unique index if not exists tournaments_trackwrestling_event_id_key
on wrestling.tournaments (trackwrestling_event_id)
where trackwrestling_event_id is not null;
