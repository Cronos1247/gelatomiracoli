alter table wrestling.profiles
  add column if not exists folkstyle_score numeric(10, 2) not null default 0,
  add column if not exists freestyle_score numeric(10, 2) not null default 0,
  add column if not exists greco_score numeric(10, 2) not null default 0,
  add column if not exists unified_score numeric(10, 2) not null default 0;
update wrestling.profiles
set
  freestyle_score = coalesce(freestyle_score, 0),
  greco_score = coalesce(greco_score, total_score, 0),
  folkstyle_score = coalesce(folkstyle_score, 0),
  unified_score = coalesce(unified_score, coalesce(folkstyle_score, 0) + coalesce(freestyle_score, 0) + coalesce(greco_score, total_score, 0))
where
  folkstyle_score = 0
  and freestyle_score = 0
  and greco_score = 0
  and unified_score = 0;
create index if not exists profiles_unified_score_idx
  on wrestling.profiles (unified_score desc, full_name asc);
