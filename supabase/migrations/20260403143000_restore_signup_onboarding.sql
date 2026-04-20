alter table public.companies
add column if not exists logo_url text;
alter table public.profiles
add column if not exists primary_contact_name text,
add column if not exists mobile_phone text,
add column if not exists sms_opt_in boolean not null default false;
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'company-logos',
  'company-logos',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "authenticated can read company-logos bucket" on storage.objects;
drop policy if exists "authenticated can upload to company-logos bucket" on storage.objects;
drop policy if exists "authenticated can update company-logos bucket" on storage.objects;
drop policy if exists "authenticated can delete from company-logos bucket" on storage.objects;
drop policy if exists "authenticated can delete company-logos bucket" on storage.objects;
create policy "authenticated can read company-logos bucket"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = current_company_id()::text
);
create policy "authenticated can upload to company-logos bucket"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = current_company_id()::text
);
create policy "authenticated can update company-logos bucket"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = current_company_id()::text
)
with check (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = current_company_id()::text
);
create policy "authenticated can delete company-logos bucket"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'company-logos'
  and (storage.foldername(name))[1] = current_company_id()::text
);
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  generated_company_name text;
  generated_company_address text;
  primary_contact_name_value text;
  mobile_phone_value text;
  sms_opt_in_value boolean := false;
  normalized_invite_code text;
  invited_company_name text;
  invited_access_type text;
  resolved_subscription_status text := 'trialing';
  resolved_trial_ends_at timestamptz := now() + interval '14 days';
begin
  normalized_invite_code := upper(nullif(new.raw_user_meta_data ->> 'invite_code', ''));
  generated_company_address := nullif(new.raw_user_meta_data ->> 'company_address', '');
  primary_contact_name_value := nullif(new.raw_user_meta_data ->> 'primary_contact_name', '');
  mobile_phone_value := nullif(new.raw_user_meta_data ->> 'mobile_phone', '');
  sms_opt_in_value :=
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'sms_opt_in', 'false')) in ('true', 't', '1', 'yes', 'on')
        then true
      else false
    end;

  if normalized_invite_code is not null then
    select company_name, access_type
    into invited_company_name, invited_access_type
    from public.invite_codes
    where code = normalized_invite_code
      and disabled = false
      and redeemed_at is null
      and (expires_at is null or expires_at > now())
    limit 1;

    if invited_access_type = 'tester' then
      resolved_subscription_status := 'tester';
      resolved_trial_ends_at := null;
    end if;
  end if;

  generated_company_name :=
    coalesce(
      nullif(new.raw_user_meta_data ->> 'company_name', ''),
      nullif(invited_company_name, ''),
      split_part(coalesce(new.email, 'new-company'), '@', 1) || ' Company'
    );

  insert into public.companies (name, address, subscription_status, trial_ends_at)
  values (
    generated_company_name,
    generated_company_address,
    resolved_subscription_status,
    resolved_trial_ends_at
  )
  returning id into new_company_id;

  insert into public.profiles (
    id,
    company_id,
    email,
    primary_contact_name,
    mobile_phone,
    sms_opt_in
  )
  values (
    new.id,
    new_company_id,
    new.email,
    primary_contact_name_value,
    mobile_phone_value,
    sms_opt_in_value
  );

  if normalized_invite_code is not null and invited_access_type = 'tester' then
    update public.invite_codes
    set redeemed_at = now(),
        redeemed_by_user_id = new.id,
        redeemed_company_id = new_company_id
    where code = normalized_invite_code
      and redeemed_at is null;
  end if;

  return new;
end;
$$;
