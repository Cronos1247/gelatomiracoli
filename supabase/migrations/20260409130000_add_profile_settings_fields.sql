alter table wrestling.profiles
add column if not exists address_street text,
add column if not exists address_city text,
add column if not exists address_state text,
add column if not exists address_zip text,
add column if not exists phone_number text;
