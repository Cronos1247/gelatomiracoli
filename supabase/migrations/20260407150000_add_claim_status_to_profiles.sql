alter table wrestling.profiles
add column if not exists claim_status text not null default 'unclaimed';
update wrestling.profiles
set claim_status = case
  when is_claimed = true then 'verified'
  else 'unclaimed'
end
where claim_status not in ('unclaimed', 'pending', 'verified')
  or (claim_status = 'unclaimed' and is_claimed = true)
  or claim_status is null;
alter table wrestling.profiles
drop constraint if exists profiles_claim_status_check;
alter table wrestling.profiles
add constraint profiles_claim_status_check
check (claim_status in ('unclaimed', 'pending', 'verified'));
