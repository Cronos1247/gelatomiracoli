alter table wrestling.matches
  alter column loser_id drop not null;
alter table wrestling.matches
  drop constraint if exists matches_winner_loser_check;
alter table wrestling.matches
  add constraint matches_winner_loser_check
  check (loser_id is null or winner_id <> loser_id);
alter table wrestling.matches
  drop constraint if exists matches_win_method_check;
alter table wrestling.matches
  add constraint matches_win_method_check
  check (
    win_method in (
      'Pin',
      'Tech Fall',
      'Decision',
      'Forfeit',
      'Medical Forfeit',
      'Injury Default',
      'Bye',
      'No Contest'
    )
  );
create or replace view wrestling.athlete_stats as
with athlete_match_results as (
  select
    m.winner_id as athlete_id,
    m.match_date,
    m.win_method,
    true as is_win,
    (m.win_method not in ('Forfeit', 'Medical Forfeit', 'Injury Default', 'Bye', 'No Contest')) as is_scored,
    (m.win_method in ('Forfeit', 'Medical Forfeit', 'Injury Default', 'Bye')) as is_administrative
  from wrestling.matches m

  union all

  select
    m.loser_id as athlete_id,
    m.match_date,
    m.win_method,
    false as is_win,
    (m.win_method not in ('Forfeit', 'Medical Forfeit', 'Injury Default', 'Bye', 'No Contest')) as is_scored,
    (m.win_method in ('Forfeit', 'Medical Forfeit', 'Injury Default', 'Bye')) as is_administrative
  from wrestling.matches m
  where m.loser_id is not null
)
select
  athlete_id,
  count(*) filter (where match_date >= date '2025-09-01' and win_method <> 'No Contest' and is_win) as season_wins,
  count(*) filter (where match_date >= date '2025-09-01' and win_method <> 'No Contest' and not is_win) as season_losses,
  count(*) filter (where match_date >= date '2025-09-01' and is_administrative) as season_admin_results,
  count(*) filter (where match_date >= date '2025-09-01' and is_scored) as season_scored_matches,
  count(*) filter (where win_method <> 'No Contest' and is_win) as career_wins,
  count(*) filter (where win_method <> 'No Contest' and not is_win) as career_losses,
  count(*) filter (where is_administrative) as career_admin_results,
  count(*) filter (where is_scored) as career_scored_matches,
  max(match_date) as last_match_date
from athlete_match_results
where athlete_id is not null
group by athlete_id;
grant select on wrestling.athlete_stats to anon, authenticated, service_role;
