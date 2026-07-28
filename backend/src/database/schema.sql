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
  message TEXT NOT NULL,
  status TEXT DEFAULT 'unread',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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
