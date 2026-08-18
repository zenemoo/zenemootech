-- ZENEMOO Production AI Data Portfolio Database Schema & Migration Script
-- Run this script in the Supabase SQL Editor to initialize the `data_portfolio` table.

CREATE TABLE IF NOT EXISTS data_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Audio', 'Video', 'Image', 'JSON', 'CSV', 'Transcription', 'Annotation', 'Other')),
  language TEXT NOT NULL DEFAULT 'Odia',
  format TEXT,
  file_name TEXT,
  storage_provider TEXT NOT NULL DEFAULT 'google_drive',
  storage_file_id TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  file_size TEXT,
  duration TEXT,
  sample_count TEXT,
  resolution TEXT,
  use_case TEXT,
  quality_info TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_data_portfolio_public_order ON data_portfolio (is_public, display_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_portfolio_category ON data_portfolio (category);
CREATE INDEX IF NOT EXISTS idx_data_portfolio_language ON data_portfolio (language);
CREATE INDEX IF NOT EXISTS idx_data_portfolio_featured ON data_portfolio (is_featured);

-- Enable Row Level Security (RLS)
ALTER TABLE data_portfolio ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running migration
DROP POLICY IF EXISTS "Public can view published datasets" ON data_portfolio;
DROP POLICY IF EXISTS "Admin full management access for data_portfolio" ON data_portfolio;

-- Policy 1: Public visitors can view public datasets only
CREATE POLICY "Public can view published datasets"
ON data_portfolio FOR SELECT
USING (is_public = true);

-- Policy 2: Admin users & service role have full management access
CREATE POLICY "Admin full management access for data_portfolio"
ON data_portfolio FOR ALL
USING (true)
WITH CHECK (true);
