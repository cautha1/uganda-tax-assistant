-- Make TIN nullable for informal businesses
ALTER TABLE businesses ALTER COLUMN tin DROP NOT NULL;

-- Drop the existing unique constraint (not index)
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_tin_key;

-- Create a partial unique index (only for non-null TINs)
CREATE UNIQUE INDEX businesses_tin_unique 
ON businesses (tin) 
WHERE tin IS NOT NULL;