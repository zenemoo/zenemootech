-- ZENEMOO Production Safe Migration: Referral System
-- Additive, Non-destructive, Idempotent

-- 1. Extend opportunity_applications table with referral attribution fields
ALTER TABLE IF EXISTS opportunity_applications
  ADD COLUMN IF NOT EXISTS referral_code TEXT,
  ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES talent_registrations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referrer_name TEXT,
  ADD COLUMN IF NOT EXISTS referrer_email TEXT,
  ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'talent_hub';

-- 2. Create performance indexes for referral lookups and analytics
CREATE INDEX IF NOT EXISTS idx_opportunity_applications_ref_code 
  ON opportunity_applications(referral_code);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_referred_by 
  ON opportunity_applications(referred_by_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_ref_source 
  ON opportunity_applications(referral_source);

-- 3. Ensure uniqueness on talent_registrations(registration_code)
CREATE UNIQUE INDEX IF NOT EXISTS idx_talent_registrations_code_unique 
  ON talent_registrations(registration_code) 
  WHERE registration_code IS NOT NULL;

-- 4. Safe backfill for any existing talent_registrations missing a registration_code
DO $$
DECLARE
  rec RECORD;
  part1 TEXT;
  part2 TEXT;
  new_code TEXT;
  attempts INT;
BEGIN
  FOR rec IN SELECT id FROM talent_registrations WHERE registration_code IS NULL OR registration_code = '' LOOP
    attempts := 0;
    LOOP
      attempts := attempts + 1;
      part1 := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 4));
      part2 := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 5 FOR 4));
      new_code := 'ZEN-' || part1 || '-' || part2;
      
      IF NOT EXISTS (SELECT 1 FROM talent_registrations WHERE registration_code = new_code) THEN
        UPDATE talent_registrations SET registration_code = new_code WHERE id = rec.id;
        EXIT;
      END IF;
      
      IF attempts > 50 THEN
        UPDATE talent_registrations 
        SET registration_code = 'ZEN-' || UPPER(SUBSTRING(rec.id::TEXT FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(rec.id::TEXT FROM 5 FOR 4))
        WHERE id = rec.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;
