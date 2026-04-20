drop index if exists wrestling.matches_unique_match_constraint_key;
drop trigger if exists set_unique_match_constraint_key on wrestling.matches;
drop function if exists wrestling.compute_unique_match_constraint_key(
  uuid,
  uuid,
  uuid,
  date,
  text,
  text,
  text,
  integer,
  integer
);
create or replace function wrestling.compute_unique_match_constraint_key(
  winner_profile_id uuid,
  loser_profile_id uuid,
  match_tournament_id uuid,
  match_day date,
  match_style text,
  match_win_method text,
  match_weight_class text,
  match_winner_score integer,
  match_loser_score integer,
  match_round_name text,
  match_division text,
  match_external_match_key text
)
returns text
language sql
immutable
as $$
  select coalesce(
    nullif(btrim(match_external_match_key), ''),
    least(winner_profile_id::text, loser_profile_id::text) ||
      '|' ||
      greatest(winner_profile_id::text, loser_profile_id::text) ||
      '|' ||
      match_tournament_id::text ||
      '|' ||
      match_day::text ||
      '|' ||
      coalesce(match_style, '') ||
      '|' ||
      coalesce(match_win_method, '') ||
      '|' ||
      coalesce(match_weight_class, '') ||
      '|' ||
      coalesce(match_round_name, '') ||
      '|' ||
      coalesce(match_division, '') ||
      '|' ||
      coalesce(match_winner_score::text, '') ||
      '|' ||
      coalesce(match_loser_score::text, '')
  );
$$;
with ranked_matches as (
  select
    id,
    row_number() over (
      partition by wrestling.compute_unique_match_constraint_key(
        winner_id,
        loser_id,
        tournament_id,
        match_date,
        style,
        win_method,
        weight_class,
        winner_score,
        loser_score,
        round_name,
        division,
        external_match_key
      )
      order by id asc
    ) as duplicate_rank
  from wrestling.matches
)
delete from wrestling.matches
where id in (
  select id
  from ranked_matches
  where duplicate_rank > 1
);
update wrestling.matches
set unique_match_constraint_key = wrestling.compute_unique_match_constraint_key(
  winner_id,
  loser_id,
  tournament_id,
  match_date,
  style,
  win_method,
  weight_class,
  winner_score,
  loser_score,
  round_name,
  division,
  external_match_key
);
create or replace function wrestling.set_unique_match_constraint_key()
returns trigger
language plpgsql
as $$
begin
  new.unique_match_constraint_key := wrestling.compute_unique_match_constraint_key(
    new.winner_id,
    new.loser_id,
    new.tournament_id,
    new.match_date,
    new.style,
    new.win_method,
    new.weight_class,
    new.winner_score,
    new.loser_score,
    new.round_name,
    new.division,
    new.external_match_key
  );
  return new;
end;
$$;
create trigger set_unique_match_constraint_key
before insert or update on wrestling.matches
for each row
execute function wrestling.set_unique_match_constraint_key();
create unique index matches_unique_match_constraint_key
on wrestling.matches (unique_match_constraint_key);
