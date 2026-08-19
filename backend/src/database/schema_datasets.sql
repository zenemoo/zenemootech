-- Single Table Supabase SQL Migration for Zenemoo AI Data Portfolio & Datasets
-- Run this single script in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    language TEXT DEFAULT 'Multilingual',
    drive_folder_id TEXT,
    status TEXT DEFAULT 'active',
    total_files INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    files JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access for datasets" ON public.datasets;
CREATE POLICY "Public read access for datasets" ON public.datasets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin full access for datasets" ON public.datasets;
CREATE POLICY "Admin full access for datasets" ON public.datasets FOR ALL USING (true) WITH CHECK (true);
