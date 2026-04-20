alter table wrestling.profiles
add column if not exists high_school_name text;
alter table wrestling.profiles
drop column if exists school_club;
