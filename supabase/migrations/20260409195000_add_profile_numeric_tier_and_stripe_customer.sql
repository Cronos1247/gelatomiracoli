alter table wrestling.profiles
  add column if not exists tier integer not null default 1,
  add column if not exists stripe_customer_id text;
update wrestling.profiles
set
  tier = case
    when lower(coalesce(subscription_tier, '')) = 'admin' then 99
    when lower(coalesce(subscription_tier, '')) in ('recruiter', 'tier3', '3') then 3
    when lower(coalesce(subscription_tier, '')) = 'premium' then greatest(coalesce(tier, 1), 2)
    else coalesce(tier, 1)
  end,
  stripe_customer_id = coalesce(stripe_customer_id, null)
where tier is null
   or stripe_customer_id is null
   or lower(coalesce(subscription_tier, '')) in ('admin', 'recruiter', 'tier3', '3', 'premium');
create index if not exists profiles_tier_idx
  on wrestling.profiles (tier);
create or replace function wrestling.sync_profile_access_tier()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_tier is not null then
    if lower(new.subscription_tier) = 'admin' then
      new.tier := greatest(coalesce(new.tier, 99), 99);
    elsif lower(new.subscription_tier) in ('recruiter', 'tier3', '3') then
      new.tier := greatest(coalesce(new.tier, 3), 3);
      new.subscription_tier := 'tier3';
    elsif lower(new.subscription_tier) = 'premium' then
      new.tier := greatest(coalesce(new.tier, 2), 2);
    else
      new.tier := coalesce(new.tier, 1);
      new.subscription_tier := 'standard';
    end if;
  else
    if coalesce(new.tier, 1) >= 99 then
      new.subscription_tier := 'admin';
    elsif coalesce(new.tier, 1) >= 3 then
      new.subscription_tier := 'tier3';
    elsif coalesce(new.tier, 1) = 2 then
      new.subscription_tier := 'premium';
    else
      new.subscription_tier := 'standard';
    end if;
  end if;

  return new;
end;
$$;
drop trigger if exists sync_profile_access_tier on wrestling.profiles;
create trigger sync_profile_access_tier
before insert or update on wrestling.profiles
for each row
execute function wrestling.sync_profile_access_tier();
