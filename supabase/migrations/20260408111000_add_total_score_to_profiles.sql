alter table wrestling.profiles
add column if not exists total_score numeric(10,2) not null default 0;
create index if not exists profiles_total_score_idx on wrestling.profiles (total_score desc);
