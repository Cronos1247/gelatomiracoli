alter table public.companies
add column if not exists private_logic jsonb;
update public.companies
set private_logic = jsonb_strip_nulls(
  coalesce(private_logic, '{}'::jsonb) || jsonb_build_object(
    'pricing_overrides',
    jsonb_build_array(
      jsonb_build_object(
        'label', 'Mop Sink',
        'match_terms', jsonb_build_array('mop sink', 'service sink', 'janitor sink'),
        'total_price', 550
      ),
      jsonb_build_object(
        'label', 'Fire Stopping',
        'match_terms', jsonb_build_array('fire stopping', 'firestop', 'fire stop'),
        'total_price', 2500
      )
    ),
    'export_template',
    jsonb_build_object(
      'name', 'Job Cost Breakout - APT Template Main Sheet',
      'headers', jsonb_build_array(
        'Sonny Code',
        'Drawing Label',
        'Item Description',
        'Quantity',
        'Manufacturer',
        'Model Number',
        'Source',
        'Review Status'
      ),
      'columns', jsonb_build_array(
        'code',
        'drawing_label',
        'item_description',
        'quantity',
        'manufacturer',
        'model_number',
        'source',
        'review_status'
      )
    )
  )
)
where id = 'c2e779a2-b623-4d07-8dcd-a137c292cb41';
insert into public.company_materials (
  company_id,
  item_name,
  parent_category,
  unit_multiplier,
  is_private
)
select
  'c2e779a2-b623-4d07-8dcd-a137c292cb41',
  item_name,
  parent_category,
  unit_multiplier,
  true
from (
  values
    ('WC-1', 'Water Closet', 1.0),
    ('WC-2 ADA', 'ADA Water Closet', 1.0),
    ('L-1', 'Lavatory 1', 1.0),
    ('SK-1', 'Kitchen Sink', 1.0),
    ('WH-1', 'Water Heater', 1.0),
    ('BT 60X30', 'Tub 60x30', 1.0),
    ('SH 48X36', 'Shower 48x36', 1.0)
) as alias_map(item_name, parent_category, unit_multiplier)
where exists (
  select 1
  from public.companies
  where id = 'c2e779a2-b623-4d07-8dcd-a137c292cb41'
)
and not exists (
  select 1
  from public.company_materials
  where company_materials.company_id = 'c2e779a2-b623-4d07-8dcd-a137c292cb41'
    and lower(company_materials.item_name) = lower(alias_map.item_name)
    and lower(company_materials.parent_category) = lower(alias_map.parent_category)
);
