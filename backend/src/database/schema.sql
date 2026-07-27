-- ZENEMOO Data Solutions Supabase PostgreSQL Schema Definition

-- 1. Media Table (Cloudinary + Supabase Asset Storage)
CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    folder TEXT NOT NULL DEFAULT 'zenemoo/team',
    public_id TEXT NOT NULL,
    image_url TEXT NOT NULL,
    asset_id TEXT,
    width INT,
    height INT,
    format TEXT,
    bytes BIGINT,
    uploaded_by TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Team Table
CREATE TABLE IF NOT EXISTS public.team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    image TEXT NOT NULL,
    bio TEXT,
    skills TEXT[] DEFAULT '{}',
    badge TEXT DEFAULT 'Specialist',
    email TEXT,
    linkedin TEXT,
    github TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT NOT NULL,
    features TEXT[] DEFAULT '{}',
    tag TEXT,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Portfolio Table
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    client TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Blog Table
CREATE TABLE IF NOT EXISTS public.blog (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    cover_image TEXT,
    author TEXT DEFAULT 'Zenemoo Team',
    published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Gallery Table
CREATE TABLE IF NOT EXISTS public.gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT,
    image_url TEXT NOT NULL,
    cloudinary_public_id TEXT,
    folder TEXT DEFAULT 'zenemoo/gallery',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Testimonials Table
CREATE TABLE IF NOT EXISTS public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author TEXT NOT NULL,
    role TEXT NOT NULL,
    company TEXT NOT NULL,
    quote TEXT NOT NULL,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Contacts Table
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    service TEXT,
    language TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'NEW',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    id INT PRIMARY KEY DEFAULT 1,
    site_name TEXT DEFAULT 'ZENEMOO',
    tagline TEXT DEFAULT 'Professional Language & AI Data Services',
    daily_output INT DEFAULT 180,
    monthly_output INT DEFAULT 3600,
    accuracy_rate INT DEFAULT 99,
    active_specialists INT DEFAULT 20,
    contact_email TEXT DEFAULT 'quantumcoderstechlab@gmail.com',
    contact_phone TEXT DEFAULT '+91 9827775230',
    location TEXT DEFAULT 'Berhampur, Odisha, India – 760001',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
