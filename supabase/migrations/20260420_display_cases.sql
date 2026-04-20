CREATE TABLE IF NOT EXISTS display_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity_pans INTEGER NOT NULL,
  target_temp_c DECIMAL(4,2),
  pac_range_min INTEGER NOT NULL,
  pac_range_max INTEGER NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recipes
ADD COLUMN IF NOT EXISTS active_case_id UUID REFERENCES display_cases(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_on_display BOOLEAN DEFAULT FALSE;
