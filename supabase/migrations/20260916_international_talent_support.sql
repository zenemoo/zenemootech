-- ZENEMOO AI Data Talent & Partner Network — Global / International Talent Support Migration
-- Description: Adds 'country' column with 'India' default and makes 'state' column nullable for international compatibility.
-- Note: Non-destructive, backward-compatible migration. Existing records remain completely unaffected.

-- 1. Add country column if not exists
ALTER TABLE talent_registrations 
  ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'India';

-- 2. Ensure state column is nullable so countries without state/province systems can submit smoothly
ALTER TABLE talent_registrations 
  ALTER COLUMN state DROP NOT NULL;

-- 3. Create index for fast admin country filtering & analytics
CREATE INDEX IF NOT EXISTS idx_talent_reg_country ON talent_registrations(country);

-- 4. Backfill any existing NULL country entries safely to 'India' (Idempotent)
UPDATE talent_registrations 
  SET country = 'India' 
  WHERE country IS NULL OR country = '';
