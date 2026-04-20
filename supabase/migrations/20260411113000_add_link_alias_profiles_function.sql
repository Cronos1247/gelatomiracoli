create or replace function public.link_alias_profiles(
  primary_profile_id uuid,
  alias_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, wrestling
as $$
declare
  primary_profile wrestling.profiles%rowtype;
  alias_profile wrestling.profiles%rowtype;
  merged_match_count integer := 0;
  removed_duplicate_match_count integer := 0;
  moved_identity_count integer := 0;
  moved_favorite_count integer := 0;
  moved_watchlist_count integer := 0;
begin
  if primary_profile_id is null or alias_profile_id is null then
    raise exception 'Both primary_profile_id and alias_profile_id are required.';
  end if;

  if primary_profile_id = alias_profile_id then
    raise exception 'Primary and alias profile IDs must be different.';
  end if;

  select *
  into primary_profile
  from wrestling.profiles
  where id = primary_profile_id;

  if not found then
    raise exception 'Primary profile % was not found.', primary_profile_id;
  end if;

  select *
  into alias_profile
  from wrestling.profiles
  where id = alias_profile_id;

  if not found then
    raise exception 'Alias profile % was not found.', alias_profile_id;
  end if;

  if primary_profile.usa_wrestling_id is null and alias_profile.usa_wrestling_id is not null then
    update wrestling.profiles
    set usa_wrestling_id = null
    where id = alias_profile_id;
  end if;

  update wrestling.profiles
  set
    usa_wrestling_id = coalesce(wrestling.profiles.usa_wrestling_id, alias_profile.usa_wrestling_id),
    hometown = coalesce(wrestling.profiles.hometown, alias_profile.hometown),
    state = coalesce(wrestling.profiles.state, alias_profile.state),
    weight_class = coalesce(wrestling.profiles.weight_class, alias_profile.weight_class),
    division = coalesce(wrestling.profiles.division, alias_profile.division),
    school_grade = coalesce(wrestling.profiles.school_grade, alias_profile.school_grade),
    graduation_year = coalesce(wrestling.profiles.graduation_year, alias_profile.graduation_year),
    grad_year = coalesce(wrestling.profiles.grad_year, alias_profile.grad_year),
    birth_year = coalesce(wrestling.profiles.birth_year, alias_profile.birth_year),
    gpa = case
      when wrestling.profiles.gpa is null or wrestling.profiles.gpa = 0 then alias_profile.gpa
      else wrestling.profiles.gpa
    end,
    is_committed = wrestling.profiles.is_committed or coalesce(alias_profile.is_committed, false),
    commitment_status = wrestling.profiles.commitment_status or coalesce(alias_profile.commitment_status, false),
    committed_school = coalesce(wrestling.profiles.committed_school, alias_profile.committed_school),
    allow_recruiter_contact = wrestling.profiles.allow_recruiter_contact or coalesce(alias_profile.allow_recruiter_contact, false),
    instagram_handle = coalesce(wrestling.profiles.instagram_handle, alias_profile.instagram_handle),
    x_handle = coalesce(wrestling.profiles.x_handle, alias_profile.x_handle),
    highlight_video_url = coalesce(wrestling.profiles.highlight_video_url, alias_profile.highlight_video_url),
    verification_status = case
      when wrestling.profiles.verification_status = 'verified' or alias_profile.verification_status = 'verified' then 'verified'
      when wrestling.profiles.verification_status = 'temporary_verified' or alias_profile.verification_status = 'temporary_verified' then 'temporary_verified'
      when wrestling.profiles.verification_status = 'pending_review' or alias_profile.verification_status = 'pending_review' then 'pending_review'
      else wrestling.profiles.verification_status
    end,
    headshot_path = coalesce(wrestling.profiles.headshot_path, alias_profile.headshot_path),
    usaw_card_path = coalesce(wrestling.profiles.usaw_card_path, alias_profile.usaw_card_path),
    temporary_verified_until = coalesce(
      greatest(wrestling.profiles.temporary_verified_until, alias_profile.temporary_verified_until),
      wrestling.profiles.temporary_verified_until,
      alias_profile.temporary_verified_until
    ),
    manual_review_required = wrestling.profiles.manual_review_required or coalesce(alias_profile.manual_review_required, false),
    previous_rank = coalesce(wrestling.profiles.previous_rank, alias_profile.previous_rank),
    high_school_name = coalesce(wrestling.profiles.high_school_name, alias_profile.high_school_name),
    club_name = coalesce(wrestling.profiles.club_name, alias_profile.club_name),
    other_accomplishments = coalesce(wrestling.profiles.other_accomplishments, alias_profile.other_accomplishments),
    video_links = case
      when coalesce(array_length(wrestling.profiles.video_links, 1), 0) > 0 then wrestling.profiles.video_links
      else alias_profile.video_links
    end,
    is_claimed = wrestling.profiles.is_claimed or coalesce(alias_profile.is_claimed, false),
    claim_status = case
      when wrestling.profiles.claim_status = 'verified' or alias_profile.claim_status = 'verified' then 'verified'
      when wrestling.profiles.claim_status = 'pending' or alias_profile.claim_status = 'pending' then 'pending'
      else wrestling.profiles.claim_status
    end,
    user_id = coalesce(wrestling.profiles.user_id, alias_profile.user_id)
  where wrestling.profiles.id = primary_profile_id;

  insert into wrestling.user_favorites (user_id, athlete_id)
  select distinct favorite.user_id, primary_profile_id
  from wrestling.user_favorites favorite
  where favorite.athlete_id = alias_profile_id
    and not exists (
      select 1
      from wrestling.user_favorites existing
      where existing.user_id = favorite.user_id
        and existing.athlete_id = primary_profile_id
    );

  get diagnostics moved_favorite_count = row_count;

  delete from wrestling.user_favorites
  where athlete_id = alias_profile_id;

  insert into wrestling.recruiter_watchlists (recruiter_id, athlete_id)
  select distinct watchlist.recruiter_id, primary_profile_id
  from wrestling.recruiter_watchlists watchlist
  where watchlist.athlete_id = alias_profile_id
    and not exists (
      select 1
      from wrestling.recruiter_watchlists existing
      where existing.recruiter_id = watchlist.recruiter_id
        and existing.athlete_id = primary_profile_id
    );

  get diagnostics moved_watchlist_count = row_count;

  delete from wrestling.recruiter_watchlists
  where athlete_id = alias_profile_id;

  update wrestling.profile_identities
  set profile_id = primary_profile_id
  where profile_id = alias_profile_id;

  get diagnostics moved_identity_count = row_count;

  delete from wrestling.matches match_to_remove
  where (match_to_remove.winner_id = alias_profile_id or match_to_remove.loser_id = alias_profile_id)
    and exists (
      select 1
      from wrestling.matches existing_match
      where existing_match.id <> match_to_remove.id
        and existing_match.unique_match_constraint_key = wrestling.compute_unique_match_constraint_key(
          case
            when match_to_remove.winner_id = alias_profile_id then primary_profile_id
            else match_to_remove.winner_id
          end,
          case
            when match_to_remove.loser_id = alias_profile_id then primary_profile_id
            else match_to_remove.loser_id
          end,
          match_to_remove.tournament_id,
          match_to_remove.match_date,
          match_to_remove.style,
          match_to_remove.win_method,
          match_to_remove.weight_class,
          match_to_remove.winner_score,
          match_to_remove.loser_score,
          match_to_remove.round_name,
          match_to_remove.division,
          match_to_remove.external_match_key
        )
    );

  get diagnostics removed_duplicate_match_count = row_count;

  update wrestling.matches
  set
    winner_id = case when winner_id = alias_profile_id then primary_profile_id else winner_id end,
    loser_id = case when loser_id = alias_profile_id then primary_profile_id else loser_id end
  where winner_id = alias_profile_id or loser_id = alias_profile_id;

  get diagnostics merged_match_count = row_count;

  delete from wrestling.profiles
  where id = alias_profile_id;

  return jsonb_build_object(
    'primary_profile_id', primary_profile_id,
    'alias_profile_id', alias_profile_id,
    'merged_match_count', merged_match_count,
    'removed_duplicate_match_count', removed_duplicate_match_count,
    'moved_identity_count', moved_identity_count,
    'moved_favorite_count', moved_favorite_count,
    'moved_watchlist_count', moved_watchlist_count,
    'score_refresh_recommended', true
  );
end;
$$;
revoke all on function public.link_alias_profiles(uuid, uuid) from public;
grant execute on function public.link_alias_profiles(uuid, uuid) to service_role;
