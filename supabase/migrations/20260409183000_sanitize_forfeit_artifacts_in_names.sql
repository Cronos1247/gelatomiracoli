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
              regexp_replace(coalesce(raw_value, ''), '(?i)\b(?:mff|medical\s+forfeit|forfiet|forfeit|fft|injury|inj|bye|unattached|una)\b', ' ', 'g'),
              '[*\[\]()]', ' ', 'g'
            ),
            '\(\s*\)', ' ', 'g'
          ),
          '\s*[-–—/:|]+\s*$', '', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;
update wrestling.profiles
set full_name = wrestling.sanitize_athlete_name(full_name)
where full_name ~* '(forfiet|forfeit)';
update wrestling.matches
set winner_name = wrestling.sanitize_athlete_name(winner_name)
where winner_name ~* '(forfiet|forfeit)';
update wrestling.matches
set loser_name = wrestling.sanitize_athlete_name(loser_name)
where loser_name ~* '(forfiet|forfeit)';
