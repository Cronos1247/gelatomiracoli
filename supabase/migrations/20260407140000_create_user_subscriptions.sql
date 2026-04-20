create table if not exists wrestling.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text,
  current_period_end timestamptz
);
create index if not exists user_subscriptions_status_idx
  on wrestling.user_subscriptions (status);
alter table wrestling.user_subscriptions enable row level security;
grant select on wrestling.user_subscriptions to authenticated;
grant select, insert, update, delete on wrestling.user_subscriptions to service_role;
drop policy if exists "Users can view their own subscription" on wrestling.user_subscriptions;
create policy "Users can view their own subscription"
on wrestling.user_subscriptions
for select
to authenticated
using (auth.uid() = user_id);
