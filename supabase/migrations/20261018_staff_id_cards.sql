-- ==============================================================================
-- ZENEMOO Production Database Migration — Staff ID Card Generator
-- Table: staff_id_cards
-- Description: Stores card configurations, display overrides, field visibility,
--              and Cloudinary asset ownership metadata without storing image blobs.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS staff_id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id TEXT NOT NULL,
  team_member_id UUID REFERENCES team(id) ON DELETE SET NULL,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'fetched')),
  
  -- Card display values & overrides (fallbacks resolved from team member when null)
  card_full_name TEXT NOT NULL,
  card_designation TEXT,
  card_department TEXT,
  card_email TEXT,
  card_phone TEXT,
  card_photo_url TEXT,
  card_photo_public_id TEXT,
  card_photo_is_owned BOOLEAN DEFAULT false,
  card_joining_year TEXT,
  
  -- QR code destination (canonical public profile URL)
  qr_destination_url TEXT,
  
  -- Optional field visibility toggles
  field_visibility JSONB DEFAULT '{
    "designation": true,
    "staff_id": true,
    "email": true,
    "phone": true,
    "department": true,
    "joining_year": true,
    "qr_code": true
  }'::jsonb,
  
  -- Visual styling configuration
  theme_preset TEXT DEFAULT 'signature_light',
  
  -- Admin metadata
  notes TEXT,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint ensuring one configuration per staff member
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_id_cards_staff_id ON staff_id_cards (LOWER(staff_id));
CREATE INDEX IF NOT EXISTS idx_staff_id_cards_team_member ON staff_id_cards (team_member_id);

-- Speed up single-record Staff ID lookups on team table
CREATE INDEX IF NOT EXISTS idx_team_employee_id ON team (LOWER(employee_id));
