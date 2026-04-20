alter table wrestling.matches
add column if not exists winner_score integer,
add column if not exists loser_score integer;
