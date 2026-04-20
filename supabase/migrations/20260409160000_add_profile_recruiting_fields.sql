alter table wrestling.profiles
  add column if not exists is_committed boolean not null default false,
  add column if not exists committed_school text,
  add column if not exists allow_recruiter_contact boolean not null default false;
update wrestling.profiles
set
  is_committed = coalesce(is_committed, false),
  allow_recruiter_contact = coalesce(allow_recruiter_contact, false)
where is_committed is null
   or allow_recruiter_contact is null;
alter table wrestling.profiles
  drop constraint if exists profiles_gpa_range_check;
alter table wrestling.profiles
  add constraint profiles_gpa_range_check
  check (gpa is null or (gpa >= 0 and gpa <= 5));
