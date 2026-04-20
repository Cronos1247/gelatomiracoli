alter table wrestling.profiles
  add column if not exists grad_year integer,
  add column if not exists gpa numeric(3,2),
  add column if not exists instagram_handle text,
  add column if not exists x_handle text,
  add column if not exists highlight_video_url text,
  add column if not exists verification_status text not null default 'unverified',
  add column if not exists headshot_path text,
  add column if not exists usaw_card_path text;
update wrestling.profiles
set grad_year = coalesce(grad_year, graduation_year),
    graduation_year = coalesce(graduation_year, grad_year)
where grad_year is distinct from coalesce(grad_year, graduation_year)
   or graduation_year is distinct from coalesce(graduation_year, grad_year);
update wrestling.profiles
set verification_status = case
  when claim_status = 'verified' then 'verified'
  when is_claimed = true then 'pending_review'
  else 'unverified'
end
where verification_status not in ('unverified', 'pending_review', 'verified')
   or verification_status is null;
alter table wrestling.profiles
  drop constraint if exists profiles_verification_status_check;
alter table wrestling.profiles
  add constraint profiles_verification_status_check
  check (verification_status in ('unverified', 'pending_review', 'verified'));
insert into storage.buckets (id, name, public)
values
  ('athlete_headshots', 'athlete_headshots', true),
  ('usaw_cards', 'usaw_cards', false)
on conflict (id) do nothing;
drop policy if exists "Public can view athlete headshots" on storage.objects;
create policy "Public can view athlete headshots"
on storage.objects
for select
to public
using (bucket_id = 'athlete_headshots');
drop policy if exists "Authenticated users can upload athlete headshots" on storage.objects;
create policy "Authenticated users can upload athlete headshots"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'athlete_headshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Authenticated users can update athlete headshots" on storage.objects;
create policy "Authenticated users can update athlete headshots"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'athlete_headshots'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'athlete_headshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Authenticated users can delete athlete headshots" on storage.objects;
create policy "Authenticated users can delete athlete headshots"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'athlete_headshots'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Authenticated users can upload usaw cards" on storage.objects;
create policy "Authenticated users can upload usaw cards"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'usaw_cards'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Authenticated users can update usaw cards" on storage.objects;
create policy "Authenticated users can update usaw cards"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'usaw_cards'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'usaw_cards'
  and (storage.foldername(name))[1] = auth.uid()::text
);
drop policy if exists "Authenticated users can delete usaw cards" on storage.objects;
create policy "Authenticated users can delete usaw cards"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'usaw_cards'
  and (storage.foldername(name))[1] = auth.uid()::text
);
