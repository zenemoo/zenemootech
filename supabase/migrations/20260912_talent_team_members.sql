-- ZENEMOO Production Safe Migration: Vendor/Agency Talent Team Members
-- Additive, Non-destructive, Idempotent

-- 1. Add team invite token fields to talent_registrations for Vendor/Agency users
ALTER TABLE IF EXISTS talent_registrations
  ADD COLUMN IF NOT EXISTS team_invite_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS team_invite_active BOOLEAN DEFAULT TRUE;

-- 2. Create talent_team_members table
CREATE TABLE IF NOT EXISTS talent_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_registration_id UUID NOT NULL REFERENCES talent_registrations(id) ON DELETE CASCADE,
  member_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  country_code TEXT DEFAULT '+91',
  gender TEXT,
  state TEXT,
  city_district TEXT,
  languages JSONB DEFAULT '[]'::jsonb,
  preferred_contact TEXT DEFAULT 'WhatsApp',
  availability TEXT DEFAULT 'Immediately',
  skills_notes TEXT,
  status TEXT DEFAULT 'active',
  source TEXT DEFAULT 'manual', -- 'manual' | 'share_link'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

-- 3. Performance & lookup indexes
CREATE INDEX IF NOT EXISTS idx_talent_team_members_vendor 
  ON talent_team_members(vendor_registration_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_talent_team_members_email 
  ON talent_team_members(email) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_talent_team_members_phone 
  ON talent_team_members(phone) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_talent_team_members_status 
  ON talent_team_members(status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_talent_registrations_invite_token 
  ON talent_registrations(team_invite_token) 
  WHERE team_invite_token IS NOT NULL;
