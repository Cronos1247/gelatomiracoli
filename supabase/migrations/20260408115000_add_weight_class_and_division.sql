alter table wrestling.profiles
add column if not exists weight_class text,
add column if not exists division text;
alter table wrestling.matches
add column if not exists weight_class text,
add column if not exists division text;
alter table wrestling.matches
drop constraint if exists matches_style_check;
alter table wrestling.matches
add constraint matches_style_check
check (style in ('Freestyle', 'Greco', 'Folkstyle', 'Scholastic'));
create or replace function public.calculate_athlete_score(profile_uuid uuid)
returns numeric
language sql
stable
security definer
set search_path = public, wrestling
as $$
  select coalesce(
    sum(
      case
        when m.style in ('Folkstyle', 'Scholastic') then 0
        else
          case m.win_method
            when 'Pin' then 2.0
            when 'Tech Fall' then 1.5
            when 'Decision' then 1.0
            else 0
          end * t.tier_multiplier
      end
    ),
    0
  )
  from wrestling.matches m
  join wrestling.tournaments t on t.id = m.tournament_id
  where m.winner_id = profile_uuid;
$$;
