-- Add annual_turnover column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS annual_turnover numeric DEFAULT 0;

-- Migrate existing turnover data to new column
UPDATE public.businesses SET annual_turnover = turnover WHERE annual_turnover IS NULL OR annual_turnover = 0;