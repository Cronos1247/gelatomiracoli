alter table public.ingredients
  add column if not exists status text not null default 'draft';
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'ingredients_status_check'
  ) then
    alter table public.ingredients
      add constraint ingredients_status_check
      check (status in ('draft', 'verified', 'needs_review'));
  end if;
end
$$;
update public.ingredients
   set status = 'verified'
 where is_master = true
   and status <> 'verified';
create or replace function public.publish_master_ingredient(
  p_admin_id uuid,
  p_name text,
  p_brand_name text,
  p_product_code text,
  p_upc text,
  p_revision_date date,
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
  normalized_product_code text;
  existing_row public.ingredients%rowtype;
  final_row public.ingredients%rowtype;
begin
  configured_admin := nullif(current_setting('app.miracoli_master_admin_uuid', true), '')::uuid;

  if configured_admin is null then
    raise exception 'Master admin UUID is not configured.';
  end if;

  if p_admin_id is distinct from configured_admin then
    raise exception 'Unauthorized master publish attempt.';
  end if;

  normalized_product_code := nullif(upper(btrim(coalesce(p_product_code, ''))), '');

  if normalized_product_code is not null then
    select *
      into existing_row
      from public.ingredients
     where upper(product_code) = normalized_product_code
     order by coalesce(revision_date, date '1900-01-01') desc, created_at desc
     limit 1;

    if found then
      if p_revision_date is null or (
        existing_row.revision_date is not null and p_revision_date <= existing_row.revision_date
      ) then
        return existing_row;
      end if;

      update public.ingredients
         set name = p_name,
             brand_name = nullif(p_brand_name, ''),
             product_code = nullif(p_product_code, ''),
             upc = nullif(p_upc, ''),
             revision_date = p_revision_date,
             category = p_category,
             fat_pct = coalesce(p_fat_pct, 0),
             sugar_pct = coalesce(p_sugar_pct, 0),
             total_solids_pct = coalesce(p_total_solids_pct, 0),
             msnf_pct = coalesce(p_msnf_pct, 0),
             solids_non_fat_pct = coalesce(p_solids_non_fat_pct, 0),
             other_solids_pct = coalesce(p_other_solids_pct, 0),
             pac_value = coalesce(p_pac_value, 0),
             pod_value = coalesce(p_pod_value, 0),
             cost_per_kg = coalesce(p_cost_per_kg, 0),
             average_market_cost = coalesce(p_average_market_cost, p_cost_per_kg, 0),
             is_cold_process = coalesce(p_is_cold_process, true),
             is_base_ingredient = coalesce(p_is_base_ingredient, false),
             is_master = true,
             status = 'verified',
             dosage_guideline = p_dosage_guideline,
             dosage_guideline_per_kg = p_dosage_guideline,
             pdf_url = p_pdf_url,
             raw_ocr_dump = coalesce(p_raw_ocr_dump, ''),
             extraction_source = coalesce(nullif(p_extraction_source, ''), 'Balancing Parameters'),
             user_id = null
       where id = existing_row.id
       returning * into final_row;

      return final_row;
    end if;
  else
    delete from public.ingredients
     where is_master = true
       and lower(name) = lower(p_name);
  end if;

  insert into public.ingredients (
    name,
    brand_name,
    product_code,
    upc,
    revision_date,
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
    status,
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
    p_revision_date,
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
    'verified',
    p_dosage_guideline,
    p_dosage_guideline,
    p_pdf_url,
    coalesce(p_raw_ocr_dump, ''),
    coalesce(nullif(p_extraction_source, ''), 'Balancing Parameters'),
    null
  )
  returning * into final_row;

  return final_row;
end;
$$;
create or replace function public.publish_master_ingredients_batch(
  p_admin_id uuid,
  p_items jsonb
)
returns setof public.ingredients
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  committed_row public.ingredients%rowtype;
begin
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Batch payload must be a JSON array.';
  end if;

  for payload in
    select value
      from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    committed_row := public.publish_master_ingredient(
      p_admin_id,
      payload->>'name',
      payload->>'brand_name',
      payload->>'product_code',
      payload->>'upc',
      nullif(payload->>'revision_date', '')::date,
      coalesce(payload->>'category', 'Other'),
      coalesce((payload->>'fat_pct')::numeric, 0),
      coalesce((payload->>'sugar_pct')::numeric, 0),
      coalesce((payload->>'total_solids_pct')::numeric, 0),
      coalesce((payload->>'msnf_pct')::numeric, 0),
      coalesce((payload->>'solids_non_fat_pct')::numeric, 0),
      coalesce((payload->>'other_solids_pct')::numeric, 0),
      coalesce((payload->>'pac_value')::numeric, 0),
      coalesce((payload->>'pod_value')::numeric, 0),
      coalesce((payload->>'cost_per_kg')::numeric, 0),
      coalesce((payload->>'average_market_cost')::numeric, 0),
      coalesce((payload->>'is_cold_process')::boolean, true),
      coalesce((payload->>'is_base_ingredient')::boolean, false),
      nullif(payload->>'dosage_guideline', '')::numeric,
      nullif(payload->>'pdf_url', ''),
      coalesce(payload->>'raw_ocr_dump', ''),
      coalesce(payload->>'extraction_source', 'Balancing Parameters')
    );

    return next committed_row;
  end loop;

  return;
end;
$$;
revoke all on function public.publish_master_ingredients_batch(uuid, jsonb) from public;
grant execute on function public.publish_master_ingredients_batch(uuid, jsonb)
  to authenticated, service_role;
