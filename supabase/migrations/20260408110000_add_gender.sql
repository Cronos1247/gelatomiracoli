alter table wrestling.profiles
add column if not exists gender text not null default 'Male';
update wrestling.profiles
set gender = 'Male'
where gender is null or gender not in ('Male', 'Female');
alter table wrestling.profiles
drop constraint if exists profiles_gender_check;
alter table wrestling.profiles
add constraint profiles_gender_check
check (gender in ('Male', 'Female'));
