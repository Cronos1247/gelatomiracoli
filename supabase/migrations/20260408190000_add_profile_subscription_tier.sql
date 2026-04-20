alter table wrestling.profiles
add column if not exists subscription_tier text not null default 'standard';
update wrestling.profiles
set subscription_tier = 'standard'
where subscription_tier is null;
