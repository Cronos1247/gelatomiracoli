drop function if exists public.get_latest_ranking_status();
create function public.get_latest_ranking_status()
returns table (
  last_updated timestamptz,
  next_update timestamptz,
  total_athletes_indexed bigint,
  eligible_athletes_indexed bigint,
  total_matches_scanned bigint
)
language sql
security definer
set search_path = public, wrestling
as $$
  with latest_status as (
    select
      status.last_synced_at,
      status.total_athletes_indexed,
      status.eligible_athletes_indexed,
      coalesce(
        status.total_matches_scanned,
        (status.metadata ->> 'matches_scored')::bigint,
        0
      ) as total_matches_scanned
    from wrestling.ranking_sync_status status
    order by status.last_synced_at desc
    limit 1
  )
  select
    latest_status.last_synced_at as last_updated,
    (
      (
        date_trunc('week', timezone('America/Chicago', now()))
        + interval '7 days'
        + interval '2 hours'
      ) at time zone 'America/Chicago'
    ) as next_update,
    latest_status.total_athletes_indexed,
    latest_status.eligible_athletes_indexed,
    latest_status.total_matches_scanned
  from latest_status;
$$;
grant execute on function public.get_latest_ranking_status() to anon, authenticated, service_role;
