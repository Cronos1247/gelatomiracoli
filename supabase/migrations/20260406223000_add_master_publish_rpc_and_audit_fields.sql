alter table public.ingredients
  add column if not exists brand_name text,
  add column if not exists product_code text,
  add column if not exists upc text,
  add column if not exists average_market_cost numeric(10,2),
  add column if not exists raw_ocr_dump text,
  add column if not exists extraction_source text not null default 'Balancing Parameters';
create or replace function public.publish_master_ingredient(
  p_admin_id uuid,
  p_name text,
  p_brand_name text,
  p_product_code text,
  p_upc text,
  p_category text,
  p_fat_pct numeric,
  p_sugar_pct numeric,
  p_total_solids_pct numeric,
  p_msnf_pct numeric,
  p_solids_non_fat_pct numeric,
  p_other_solids_pct numeric,
  p_pac_value numeric,
  p_pod_value numeric,
  p_cost_per_kg numeric,
  p_average_market_cost numeric,
  p_is_cold_process boolean,
  p_is_base_ingredient boolean,
  p_dosage_guideline numeric,
  p_pdf_url text,
  p_raw_ocr_dump text,
  p_extraction_source text
)
returns public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  configured_admin uuid;
  created_row public.ingredients%rowtype;
begin
  configured_admin := nullif(current_setting('app.miracoli_master_admin_uuid', true), '')::uuid;

  if configured_admin is null then
    raise exception 'Master admin UUID is not configured.';
  end if;

  if p_admin_id is distinct from configured_admin then
    raise exception 'Unauthorized master publish attempt.';
  end if;

  delete from public.ingredients
  where is_master = true
    and lower(name) = lower(p_name);

  insert into public.ingredients (
    name,
    brand_name,
    product_code,
    upc,
    category,
    fat_pct,
    sugar_pct,
    total_solids_pct,
    msnf_pct,
    solids_non_fat_pct,
    other_solids_pct,
    pac_value,
    pod_value,
    cost_per_kg,
    average_market_cost,
    is_cold_process,
    is_base_ingredient,
    is_master,
    dosage_guideline,
    dosage_guideline_per_kg,
    pdf_url,
    raw_ocr_dump,
    extraction_source,
    user_id
  )
  values (
    p_name,
    nullif(p_brand_name, ''),
    nullif(p_product_code, ''),
    nullif(p_upc, ''),
    p_category,
    coalesce(p_fat_pct, 0),
    coalesce(p_sugar_pct, 0),
    coalesce(p_total_solids_pct, 0),
    coalesce(p_msnf_pct, 0),
    coalesce(p_solids_non_fat_pct, 0),
    coalesce(p_other_solids_pct, 0),
    coalesce(p_pac_value, 0),
    coalesce(p_pod_value, 0),
    coalesce(p_cost_per_kg, 0),
    coalesce(p_average_market_cost, p_cost_per_kg, 0),
    coalesce(p_is_cold_process, true),
    coalesce(p_is_base_ingredient, false),
    true,
    p_dosage_guideline,
    p_dosage_guideline,
    p_pdf_url,
    coalesce(p_raw_ocr_dump, ''),
    coalesce(nullif(p_extraction_source, ''), 'Balancing Parameters'),
    null
  )
  returning * into created_row;

  return created_row;
end;
$$;
revoke all on function public.publish_master_ingredient(
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean,
  numeric,
  text,
  text,
  text
) from public;
grant execute on function public.publish_master_ingredient(
  uuid,
  text,
  text,
  text,
  text,
  text,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  numeric,
  boolean,
  boolean,
  numeric,
  text,
  text,
  text
) to authenticated, service_role;
