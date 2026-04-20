create table if not exists wrestling.data_requests (
  id uuid primary key default gen_random_uuid(),
  state text not null check (char_length(trim(state)) = 2),
  gender text,
  style text,
  weight_class text,
  division text,
  search_term text,
  requested_from text not null default 'leaderboard',
  created_at timestamptz not null default timezone('utc', now())
);
alter table wrestling.data_requests enable row level security;
grant insert on wrestling.data_requests to anon, authenticated;
grant select, insert, update, delete on wrestling.data_requests to service_role;
drop policy if exists "public can insert data requests" on wrestling.data_requests;
create policy "public can insert data requests"
on wrestling.data_requests
for insert
to anon, authenticated
with check (
  state in (
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY'
  )
);
