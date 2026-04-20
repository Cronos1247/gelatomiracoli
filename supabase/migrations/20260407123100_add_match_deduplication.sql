alter table wrestling.matches
add column if not exists external_match_key text;
create unique index if not exists matches_external_match_key_key
on wrestling.matches (external_match_key)
where external_match_key is not null;
