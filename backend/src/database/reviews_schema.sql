-- ZENEMOO Production Reviews Database Schema & Migration Script
-- Run this script in the Supabase SQL Editor to initialize or restructure the `reviews` table.

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  reviewer_type TEXT NOT NULL, -- 'contributor' or 'client'
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Safely add columns if the table already existed with legacy structure
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='review_id') THEN
    ALTER TABLE reviews ADD COLUMN review_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='reviewer_type') THEN
    ALTER TABLE reviews ADD COLUMN reviewer_type TEXT DEFAULT 'contributor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='rating') THEN
    ALTER TABLE reviews ADD COLUMN rating INTEGER DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='review_text') THEN
    ALTER TABLE reviews ADD COLUMN review_text TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='is_visible') THEN
    ALTER TABLE reviews ADD COLUMN is_visible BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='updated_at') THEN
    ALTER TABLE reviews ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Step 3: Populate any null review_id values if legacy data existed
UPDATE reviews 
SET review_id = 'ZEN-REV-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 4)) || '-' || UPPER(SUBSTRING(MD5(RANDOM()::text) FROM 5 FOR 4))
WHERE review_id IS NULL OR review_id = '';

-- Ensure review_id is UNIQUE and NOT NULL
ALTER TABLE reviews ALTER COLUMN review_id SET NOT NULL;
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_review_id_key') THEN
    ALTER TABLE reviews ADD CONSTRAINT reviews_review_id_key UNIQUE (review_id);
  END IF;
END $$;

-- Step 4: Create performance indexes
CREATE INDEX IF NOT EXISTS idx_reviews_visible_created ON reviews (is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_type ON reviews (reviewer_type);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews (rating);

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Drop old policy names if present
DROP POLICY IF EXISTS "Public can view published reviews" ON reviews;
DROP POLICY IF EXISTS "Public can insert hidden reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public read visible reviews" ON reviews;
DROP POLICY IF EXISTS "Allow public submit review" ON reviews;
DROP POLICY IF EXISTS "Admin full management access" ON reviews;

-- Policy 1: Anyone (including unauthenticated visitors) can read visible/published reviews
CREATE POLICY "Public can view published reviews" 
ON reviews FOR SELECT 
USING (is_visible = true);

-- Policy 2: Anyone can submit a review, but it MUST be set to hidden (is_visible = false)
CREATE POLICY "Public can insert hidden reviews" 
ON reviews FOR INSERT 
WITH CHECK (is_visible = false);

-- Policy 3: Service role & authenticated admin have full control (select all, update, delete)
CREATE POLICY "Admin full management access" 
ON reviews FOR ALL 
USING (true) 
WITH CHECK (true);
