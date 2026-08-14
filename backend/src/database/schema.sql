-- ZENEMOO Production Database Schema
-- Run this script in the Supabase SQL Editor to wipe existing tables and initialize the new architecture.

-- Step 1: Remove old tables
DROP TABLE IF EXISTS team CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS subscribers CASCADE;
DROP TABLE IF EXISTS media CASCADE;

-- Step 2: Create Table 1: team
CREATE TABLE team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  designation TEXT,
  department TEXT,
  badge TEXT DEFAULT 'Specialist',
  skills TEXT[] DEFAULT '{}',
  bio TEXT,
  image_url TEXT,
  public_id TEXT,
  linkedin TEXT,
  github TEXT,
  twitter TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: contacts
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  service TEXT,
  language TEXT DEFAULT 'Hindi',
  inquiry_code TEXT,
  notes TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration commands for existing Supabase database:
-- Run these in Supabase SQL Editor if you want all extended metrics and staff profile columns:
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS slug TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS employee_id TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS joining_date TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS experience TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS location TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT '{}';
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS availability TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS portfolio TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS long_bio TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS ai_summary TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS projects_completed TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS accuracy TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS datasets_processed TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS hours_worked TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS completion_rate TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS quality_score TEXT;
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]';
-- ALTER TABLE team ADD COLUMN IF NOT EXISTS achievements JSONB DEFAULT '[]';

-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'Hindi';
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS inquiry_code TEXT;
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;

-- Table 3: subscribers
CREATE TABLE subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 4: media
CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT DEFAULT 'general',
  entity_id TEXT,
  asset_type TEXT DEFAULT 'image',
  original_filename TEXT,
  seo_filename TEXT,
  alt_text TEXT,
  title TEXT,
  description TEXT,
  caption TEXT,
  folder TEXT DEFAULT 'zenemoo/team',
  cloudinary_public_id TEXT,
  cloudinary_secure_url TEXT,
  public_id TEXT,
  image_url TEXT NOT NULL,
  asset_id TEXT,
  width INTEGER,
  height INTEGER,
  format TEXT,
  bytes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT
);

-- Image SEO Media Migration Commands for existing Supabase instance:
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'general';
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS entity_id TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'image';
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS original_filename TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS seo_filename TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS alt_text TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS title TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS description TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS caption TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS cloudinary_secure_url TEXT;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
-- ALTER TABLE media ADD COLUMN IF NOT EXISTS updated_by TEXT;


-- Table 5: partners
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER DEFAULT 1,
  name TEXT NOT NULL,
  role TEXT,
  badge TEXT DEFAULT 'AI Partner',
  image_url TEXT,
  public_id TEXT,
  website_url TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 6: opportunities
CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position INTEGER DEFAULT 1,
  title TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  badge TEXT DEFAULT 'ACTIVE',
  status TEXT DEFAULT 'active', -- active, stopped, coming_soon
  description TEXT,
  company_logo TEXT,
  poster_url TEXT,
  public_id TEXT,
  features TEXT[],
  requirements TEXT[],
  language_skills TEXT[],
  eligibility_criteria TEXT[],
  linkedin_post_url TEXT,
  pdf_link TEXT,
  contact_details JSONB DEFAULT '{}', -- { email, phone, contact_person }
  custom_questions JSONB DEFAULT '[]', -- array of admin questions { id, label, type, required }
  action_url TEXT DEFAULT '#desicrew-contributors',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table 7: opportunity_applications
CREATE TABLE opportunity_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id TEXT UNIQUE,
  opportunity_id TEXT NOT NULL,
  opportunity_title TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  answers JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending', -- pending, shortlisted, accepted, rejected
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);



