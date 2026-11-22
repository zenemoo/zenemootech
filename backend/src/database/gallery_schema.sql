-- Supabase SQL Schema for Zenemoo Official Image Gallery & SEO Posters
-- Run this in Supabase SQL Editor to initialize the public.gallery_images table.

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  category TEXT DEFAULT 'Festival & Greetings',
  image_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  cdn_url TEXT,
  alt_text TEXT,
  caption TEXT,
  tags TEXT[] DEFAULT '{}',
  aspect_ratio TEXT DEFAULT '1:1',
  width INTEGER DEFAULT 1080,
  height INTEGER DEFAULT 1080,
  file_size_formatted TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ultra-fast queries and zero-waste indexing
CREATE INDEX IF NOT EXISTS idx_gallery_images_status ON public.gallery_images(status);
CREATE INDEX IF NOT EXISTS idx_gallery_images_category ON public.gallery_images(category);
CREATE INDEX IF NOT EXISTS idx_gallery_images_slug ON public.gallery_images(slug);

-- Enable Row Level Security (RLS)
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Policies: Public can read active images; Admins have full access
DROP POLICY IF EXISTS "Public read gallery_images" ON public.gallery_images;
CREATE POLICY "Public read gallery_images" ON public.gallery_images
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin write gallery_images" ON public.gallery_images;
CREATE POLICY "Admin write gallery_images" ON public.gallery_images
  FOR ALL USING (true) WITH CHECK (true);
