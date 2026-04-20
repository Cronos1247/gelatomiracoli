create or replace function wrestling.sanitize_athlete_name(raw_value text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(coalesce(raw_value, ''), '(?i)(mff|medical\s+forfeit|forfiet|forfeit|fft|injury|inj|bye|unattached|una)', ' ', 'g'),
              '[*\[\]()]', ' ', 'g'
            ),
            '\(\s*\)', ' ', 'g'
          ),
          '\[\s*\]', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;
update wrestling.profiles
set full_name = cleaned.cleaned_name
from (
  select id, wrestling.sanitize_athlete_name(full_name) as cleaned_name
  from wrestling.profiles
) as cleaned
where wrestling.profiles.id = cleaned.id
  and cleaned.cleaned_name is not null
  and wrestling.profiles.full_name is distinct from cleaned.cleaned_name;
update wrestling.matches
set winner_name = cleaned.cleaned_name
from (
  select id, wrestling.sanitize_athlete_name(winner_name) as cleaned_name
  from wrestling.matches
) as cleaned
where wrestling.matches.id = cleaned.id
  and wrestling.matches.winner_name is distinct from cleaned.cleaned_name;
update wrestling.matches
set loser_name = cleaned.cleaned_name
from (
  select id, wrestling.sanitize_athlete_name(loser_name) as cleaned_name
  from wrestling.matches
) as cleaned
where wrestling.matches.id = cleaned.id
  and wrestling.matches.loser_name is distinct from cleaned.cleaned_name;
