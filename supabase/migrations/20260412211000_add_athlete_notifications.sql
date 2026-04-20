create table if not exists wrestling.athlete_notifications (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references wrestling.profiles(id) on delete cascade,
  recruiter_id uuid references auth.users(id) on delete set null,
  notification_type text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists athlete_notifications_athlete_created_idx
  on wrestling.athlete_notifications (athlete_id, created_at desc);
create index if not exists athlete_notifications_recruiter_created_idx
  on wrestling.athlete_notifications (recruiter_id, created_at desc);
alter table wrestling.athlete_notifications enable row level security;
grant select, insert, update on wrestling.athlete_notifications to authenticated;
grant select, insert, update, delete on wrestling.athlete_notifications to service_role;
drop policy if exists "Recruiters can insert athlete notifications" on wrestling.athlete_notifications;
create policy "Recruiters can insert athlete notifications"
on wrestling.athlete_notifications
for insert
to authenticated
with check (recruiter_id = auth.uid());
drop policy if exists "Athletes can read their own notifications" on wrestling.athlete_notifications;
create policy "Athletes can read their own notifications"
on wrestling.athlete_notifications
for select
to authenticated
using (
  exists (
    select 1
    from wrestling.profiles profile
    where profile.id = athlete_id
      and profile.user_id = auth.uid()
  )
  or recruiter_id = auth.uid()
);
drop policy if exists "Athletes can update their own notifications" on wrestling.athlete_notifications;
create policy "Athletes can update their own notifications"
on wrestling.athlete_notifications
for update
to authenticated
using (
  exists (
    select 1
    from wrestling.profiles profile
    where profile.id = athlete_id
      and profile.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from wrestling.profiles profile
    where profile.id = athlete_id
      and profile.user_id = auth.uid()
  )
);
