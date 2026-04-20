with ranked_matches as (
  select
    id,
    row_number() over (
      partition by
        least(winner_id::text, loser_id::text),
        greatest(winner_id::text, loser_id::text),
        tournament_id::text,
        match_date::text,
        coalesce(style, ''),
        coalesce(win_method, ''),
        coalesce(weight_class, ''),
        coalesce(winner_score::text, ''),
        coalesce(loser_score::text, '')
      order by
        case when external_match_key is not null then 1 else 0 end desc,
        (
          case when division is not null then 1 else 0 end +
          case when weight_class is not null then 1 else 0 end +
          case when winner_score is not null then 1 else 0 end +
          case when loser_score is not null then 1 else 0 end
        ) desc,
        id desc
    ) as duplicate_rank
  from wrestling.matches
)
delete from wrestling.matches
where id in (
  select id
  from ranked_matches
  where duplicate_rank > 1
);
alter table wrestling.matches
add column if not exists unique_match_constraint_key text;
create or replace function wrestling.compute_unique_match_constraint_key(
  winner_profile_id uuid,
  loser_profile_id uuid,
  match_tournament_id uuid,
  match_day date,
  match_style text,
  match_win_method text,
  match_weight_class text,
  match_winner_score integer,
  match_loser_score integer
)
returns text
language sql
immutable
as $$
  select
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
    coalesce(match_winner_score::text, '') ||
    '|' ||
    coalesce(match_loser_score::text, '');
$$;
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
  loser_score
)
where unique_match_constraint_key is null;
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
    new.loser_score
  );
  return new;
end;
$$;
drop trigger if exists set_unique_match_constraint_key on wrestling.matches;
create trigger set_unique_match_constraint_key
before insert or update on wrestling.matches
for each row
execute function wrestling.set_unique_match_constraint_key();
create unique index if not exists matches_unique_match_constraint_key
on wrestling.matches (unique_match_constraint_key);
