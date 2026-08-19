-- Supabase SQL Schema Migration for Zenemoo AI Data Portfolio & Dataset Management System

-- 1. Datasets Table
CREATE TABLE IF NOT EXISTS public.datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    language TEXT DEFAULT 'Multilingual',
    drive_folder_id TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    total_files INTEGER DEFAULT 0,
    total_size_bytes BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dataset Folders Table
CREATE TABLE IF NOT EXISTS public.dataset_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    folder_type TEXT NOT NULL CHECK (folder_type IN ('AUDIO', 'VIDEO', 'IMAGE', 'JSON', 'CSV', 'PDF', 'CUSTOM')),
    drive_folder_id TEXT,
    parent_folder_id UUID REFERENCES public.dataset_folders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dataset Files Table
CREATE TABLE IF NOT EXISTS public.dataset_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.dataset_folders(id) ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT DEFAULT 0,
    drive_file_id TEXT,
    drive_folder_id TEXT,
    drive_url TEXT,
    thumbnail_url TEXT,
    status TEXT DEFAULT 'ready' CHECK (status IN ('uploading', 'ready', 'error')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for maximum query performance
CREATE INDEX IF NOT EXISTS idx_datasets_status ON public.datasets(status);
CREATE INDEX IF NOT EXISTS idx_datasets_slug ON public.datasets(slug);
CREATE INDEX IF NOT EXISTS idx_dataset_folders_dataset_id ON public.dataset_folders(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_files_dataset_id ON public.dataset_files(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dataset_files_folder_id ON public.dataset_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_dataset_files_file_type ON public.dataset_files(file_type);

-- Row Level Security (RLS) Policies
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dataset_files ENABLE ROW LEVEL SECURITY;

-- Public Read Access Policies
CREATE POLICY "Public read access for active datasets" ON public.datasets
    FOR SELECT USING (status = 'active' OR status IS NULL);

CREATE POLICY "Public read access for dataset folders" ON public.dataset_folders
    FOR SELECT USING (true);

CREATE POLICY "Public read access for dataset files" ON public.dataset_files
    FOR SELECT USING (true);

-- Admin Full Access Policies (Service Role / Authorized Admin)
CREATE POLICY "Admin full management for datasets" ON public.datasets
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full management for dataset folders" ON public.dataset_folders
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Admin full management for dataset files" ON public.dataset_files
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger to automatically update dataset file counts & size upon file insert/delete
CREATE OR REPLACE FUNCTION update_dataset_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.datasets
        SET total_files = total_files + 1,
            total_size_bytes = total_size_bytes + COALESCE(NEW.file_size, 0),
            updated_at = NOW()
        WHERE id = NEW.dataset_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.datasets
        SET total_files = GREATEST(0, total_files - 1),
            total_size_bytes = GREATEST(0, total_size_bytes - COALESCE(OLD.file_size, 0)),
            updated_at = NOW()
        WHERE id = OLD.dataset_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_dataset_stats ON public.dataset_files;
CREATE TRIGGER trg_update_dataset_stats
AFTER INSERT OR DELETE ON public.dataset_files
FOR EACH ROW EXECUTE FUNCTION update_dataset_stats();
