update wrestling.profiles
set gpa = 0.0
where gpa is null;
alter table wrestling.profiles
  alter column gpa set default 0.0;
create index if not exists profiles_search_usaw_idx
  on wrestling.profiles (usa_wrestling_id);
create index if not exists profiles_search_name_score_idx
  on wrestling.profiles (full_name, unified_score desc);
create index if not exists profiles_recruiter_filter_idx
  on wrestling.profiles (state, weight_class, graduation_year, commitment_status, unified_score desc);
create index if not exists matches_winner_id_match_date_idx
  on wrestling.matches (winner_id, match_date desc);
create index if not exists matches_loser_id_match_date_idx
  on wrestling.matches (loser_id, match_date desc);
