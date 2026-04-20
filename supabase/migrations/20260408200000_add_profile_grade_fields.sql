alter table wrestling.profiles
add column if not exists school_grade text,
add column if not exists graduation_year integer,
add column if not exists birth_year integer;
alter table wrestling.profiles
drop constraint if exists profiles_school_grade_check;
alter table wrestling.profiles
add constraint profiles_school_grade_check
check (
  school_grade is null
  or school_grade in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Post-Grad')
);
update wrestling.profiles
set school_grade = division
where school_grade is null
  and division in ('Freshman', 'Sophomore', 'Junior', 'Senior', 'Post-Grad');
create or replace function public.calculate_athlete_score(profile_uuid uuid)
returns numeric
language sql
security definer
set search_path = public, wrestling
as $$
    select coalesce(sum(
        case
            when m.style in ('Folkstyle', 'Scholastic') then
                case
                    when m.win_method = 'Pin' then 3.0
                    when m.win_method = 'Tech Fall' then 2.25
                    when m.win_method = 'Decision'
                        and m.winner_score is not null
                        and m.loser_score is not null
                        and (m.winner_score - m.loser_score) between 8 and 14
                    then 1.35
                    else 1.0
                end * t.tier_multiplier
            else
                case
                    when m.win_method = 'Pin' then 3.0
                    when m.win_method = 'Tech Fall' then 2.25
                    when m.win_method = 'Decision'
                        and m.winner_score is not null
                        and m.loser_score is not null
                        and (m.winner_score - m.loser_score) between 8 and 14
                    then 1.35
                    else 1.0
                end * t.tier_multiplier
        end
    ), 0)
    from wrestling.matches m
    join wrestling.tournaments t on t.id = m.tournament_id
    where m.winner_id = profile_uuid;
$$;
grant execute on function public.calculate_athlete_score(uuid) to anon, authenticated, service_role;
