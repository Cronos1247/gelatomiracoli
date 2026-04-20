alter table wrestling.ranking_sync_status
  add column if not exists total_matches_scanned bigint not null default 0;
update wrestling.ranking_sync_status
set total_matches_scanned = coalesce((metadata ->> 'matches_scored')::bigint, 0)
where total_matches_scanned = 0;
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
stable
as $$
  select
    status.last_synced_at as last_updated,
    status.last_synced_at + interval '7 days' as next_update,
    status.total_athletes_indexed,
    status.eligible_athletes_indexed,
    status.total_matches_scanned
  from wrestling.ranking_sync_status status
  order by status.last_synced_at desc
  limit 1;
$$;
grant execute on function public.get_latest_ranking_status() to anon, authenticated, service_role;
create table if not exists wrestling.event_watch_queue (
  id uuid primary key default gen_random_uuid(),
  source_platform text not null check (source_platform in ('flo', 'track', 'usaw')),
  source_event_id text not null,
  event_name text not null,
  event_date date,
  discovery_query text,
  status text not null default 'pending' check (status in ('pending', 'queued', 'processing', 'completed', 'failed', 'ignored')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  participant_count integer,
  metadata jsonb not null default '{}'::jsonb,
  discovered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  queued_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_platform, source_event_id)
);
create index if not exists event_watch_queue_status_priority_idx
  on wrestling.event_watch_queue (status, priority, last_seen_at desc);
create index if not exists event_watch_queue_source_date_idx
  on wrestling.event_watch_queue (source_platform, event_date desc nulls last);
alter table wrestling.event_watch_queue enable row level security;
grant select on wrestling.event_watch_queue to authenticated, service_role;
grant insert, update, delete on wrestling.event_watch_queue to service_role;
drop policy if exists "Authenticated can read event watch queue" on wrestling.event_watch_queue;
create policy "Authenticated can read event watch queue"
on wrestling.event_watch_queue
for select
to authenticated
using (true);
