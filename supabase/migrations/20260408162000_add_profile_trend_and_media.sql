alter table wrestling.profiles
add column if not exists previous_rank integer,
add column if not exists club_name text,
add column if not exists video_links text[] not null default '{}'::text[];
