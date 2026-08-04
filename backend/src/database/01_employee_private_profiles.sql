-- ==============================================================================
-- ZENEMOO ENTERPRISE SELF-SERVICE PROFILE SYSTEM
-- Table: employee_private_profiles
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.employee_private_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id TEXT UNIQUE,
  user_account_id TEXT,
  
  -- Personal Details (PII encrypted where sensitive)
  personal_email TEXT, -- Encrypted AES-256
  personal_mobile TEXT, -- Encrypted AES-256
  alternate_mobile TEXT,
  date_of_birth TEXT,
  gender TEXT,
  blood_group TEXT,
  marital_status TEXT,
  nationality TEXT DEFAULT 'Indian',
  languages_known TEXT,
  
  -- Address Information
  current_address TEXT,
  permanent_address TEXT,
  city TEXT,
  district TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  pin_code TEXT,
  
  -- Professional Information
  professional_bio TEXT,
  technical_skills TEXT,
  certifications TEXT,
  years_of_experience TEXT,
  current_role_summary TEXT,
  areas_of_expertise TEXT,
  portfolio_website TEXT,
  linkedin_profile TEXT,
  github_profile TEXT,
  twitter_profile TEXT,
  instagram_profile TEXT,
  
  -- Financial & Banking Information (Encrypted AES-256)
  account_holder_name TEXT,
  bank_name TEXT,
  account_number TEXT, -- Encrypted AES-256
  ifsc_code TEXT,      -- Encrypted AES-256
  branch_name TEXT,
  upi_id TEXT,         -- Encrypted AES-256
  pan_number TEXT,     -- Encrypted AES-256
  aadhaar_number TEXT, -- Encrypted AES-256
  passport_number TEXT,-- Encrypted AES-256
  
  -- Emergency Contact Information
  emergency_contact_name TEXT,
  relationship TEXT,
  emergency_contact_number TEXT, -- Encrypted AES-256
  
  -- Additional Information & Metadata
  hobbies TEXT,
  interests TEXT,
  about_me TEXT,
  preferred_language TEXT DEFAULT 'English',
  availability TEXT DEFAULT 'Full-Time',
  
  -- Completion & Tracking
  profile_completion INT DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by team_member_id & user_account_id
CREATE INDEX IF NOT EXISTS idx_employee_private_profiles_member_id ON public.employee_private_profiles(team_member_id);
CREATE INDEX IF NOT EXISTS idx_employee_private_profiles_user_account ON public.employee_private_profiles(user_account_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.employee_private_profiles ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically.
-- Policy for authenticated users (handled securely via backend JWT API).
CREATE POLICY "Allow service role full access" ON public.employee_private_profiles
  FOR ALL TO service_role USING (true);
