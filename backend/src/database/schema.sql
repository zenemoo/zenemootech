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
  title TEXT,
  folder TEXT DEFAULT 'zenemoo/team',
  public_id TEXT,
  image_url TEXT NOT NULL,
  asset_id TEXT,
  width INTEGER,
  height INTEGER,
  format TEXT,
  bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
  features TEXT[],
  requirements TEXT[],
  action_url TEXT DEFAULT '#desicrew-contributors',
  poster_url TEXT,
  public_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

