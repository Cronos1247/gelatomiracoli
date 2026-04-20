create table if not exists public.signup_notification_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  email text,
  primary_contact_name text,
  mobile_phone text,
  sms_opt_in boolean not null default false,
  company_name text,
  company_address text,
  company_status text,
  logo_url text,
  plan_label text,
  price_id text,
  notification_status text not null default 'pending',
  notification_reason text,
  notification_channel text not null default 'email',
  notified boolean not null default false
);
create index if not exists signup_notification_audit_user_id_idx
  on public.signup_notification_audit (user_id);
create index if not exists signup_notification_audit_company_id_idx
  on public.signup_notification_audit (company_id);
create index if not exists signup_notification_audit_created_at_idx
  on public.signup_notification_audit (created_at desc);
alter table public.signup_notification_audit
  enable row level security;
