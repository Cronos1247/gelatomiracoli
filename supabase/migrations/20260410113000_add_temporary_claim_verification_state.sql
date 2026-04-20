alter table wrestling.profiles
  add column if not exists temporary_verified_until timestamptz,
  add column if not exists manual_review_required boolean not null default false;
update wrestling.profiles
set manual_review_required = true
where verification_status = 'pending_review'
  and manual_review_required = false;
alter table wrestling.profiles
  drop constraint if exists profiles_verification_status_check;
alter table wrestling.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('unverified', 'pending_review', 'temporary_verified', 'verified'));
create index if not exists profiles_manual_review_required_idx
  on wrestling.profiles (manual_review_required, verification_status);
create index if not exists profiles_temporary_verified_until_idx
  on wrestling.profiles (temporary_verified_until);
