ALTER TABLE public.ingredients
ADD COLUMN IF NOT EXISTS cost_per_container numeric(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS container_size_g numeric(10,2) DEFAULT 1000.00;
