create or replace function public.calculate_unified_rank(athlete_uuid uuid default null)
returns table (
  athlete_id uuid,
  athlete_rank integer
)
language sql
security definer
set search_path = public, wrestling
as $$
  with previous_ranked as (
    select
      p.id,
      row_number() over (
        order by
          coalesce(p.unified_score, 0) desc,
          coalesce(p.total_score, 0) desc,
          p.full_name asc,
          p.id asc
      ) as previous_national_rank,
      coalesce(p.unified_score, 0) as previous_unified_score
    from wrestling.profiles p
  ),
  score_rows as (
    select
      m.winner_id as athlete_id,
      m.style,
      round(
        (
          (
            case
              when m.win_method = 'Pin' then 3.0
              when m.win_method = 'Tech Fall' then 2.25
              when m.win_method = 'Decision'
                and m.winner_score is not null
                and m.loser_score is not null
                and (m.winner_score - m.loser_score) between 8 and 14
              then 1.35
              else 1.0
            end
            +
            case
              when pr.previous_national_rank <= 5 then 1.1
              when pr.previous_national_rank <= 10 then 0.9
              when pr.previous_national_rank <= 25 then 0.7
              when pr.previous_national_rank <= 50 then 0.5
              when pr.previous_national_rank <= 100 then 0.35
              when pr.previous_national_rank <= 250 then 0.2
              when pr.previous_unified_score >= 40 then 0.18
              when pr.previous_unified_score >= 25 then 0.12
              when pr.previous_unified_score >= 15 then 0.08
              when pr.previous_unified_score >= 8 then 0.04
              else 0
            end
          )
          * coalesce(t.tier_multiplier, 1)
          * case
              when m.style in ('Freestyle', 'Greco') then 1.0
              when m.style in ('Folkstyle', 'Scholastic') then 0.5
              else 1.0
            end
        )::numeric,
        2
      ) as points
    from wrestling.matches m
    left join wrestling.tournaments t
      on t.id = m.tournament_id
    left join previous_ranked pr
      on pr.id = m.loser_id
    where m.match_date >= date '2025-09-01'
  ),
  season_scores as (
    select
      p.id,
      coalesce(sum(case when sr.style in ('Folkstyle', 'Scholastic') then sr.points else 0 end), 0) as folkstyle_score,
      coalesce(sum(case when sr.style = 'Freestyle' then sr.points else 0 end), 0) as freestyle_score,
      coalesce(sum(case when sr.style = 'Greco' then sr.points else 0 end), 0) as greco_score
    from wrestling.profiles p
    left join score_rows sr
      on sr.athlete_id = p.id
    group by p.id
  ),
  ranked as (
    select
      p.id as athlete_id,
      row_number() over (
        order by
          coalesce(ss.folkstyle_score, 0) + coalesce(ss.freestyle_score, 0) + coalesce(ss.greco_score, 0) desc,
          coalesce(ss.freestyle_score, 0) + coalesce(ss.greco_score, 0) desc,
          p.full_name asc,
          p.id asc
      ) as athlete_rank
    from wrestling.profiles p
    left join season_scores ss
      on ss.id = p.id
  )
  select
    ranked.athlete_id,
    ranked.athlete_rank
  from ranked
  where athlete_uuid is null
     or ranked.athlete_id = athlete_uuid;
$$;
grant execute on function public.calculate_unified_rank(uuid) to anon, authenticated, service_role;
