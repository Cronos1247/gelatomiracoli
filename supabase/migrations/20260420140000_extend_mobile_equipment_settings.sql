ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS min_batch_l numeric(8,2) NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS max_batch_l numeric(8,2);

UPDATE public.equipment
SET max_batch_l = COALESCE(max_batch_l, max_batch_kg)
WHERE max_batch_l IS NULL;

ALTER TABLE public.display_cases
ADD COLUMN IF NOT EXISTS style text NOT NULL DEFAULT 'Traditional';
