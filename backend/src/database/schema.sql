-- ==============================================================================
-- ZENEMOO ENTERPRISE SECURITY & ADMIN DASHBOARD DATABASE SCHEMA
-- OWASP ASVS Level 2+ Compliant PostgreSQL / Supabase Schema
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ADMINS TABLE (Role-Based Access Control & Mandatory 2FA)
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SuperAdmin' CHECK (role IN ('SuperAdmin', 'Admin', 'Moderator', 'Editor', 'Viewer')),
    totp_secret TEXT,
    totp_enabled BOOLEAN DEFAULT false,
    recovery_codes JSONB DEFAULT '[]'::jsonb,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SESSIONS TABLE (Device Tracking & Refresh Token Blacklisting)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    refresh_token_hash TEXT UNIQUE NOT NULL,
    device_name TEXT,
    browser TEXT,
    os TEXT,
    ip_address TEXT,
    country TEXT DEFAULT 'India',
    city TEXT DEFAULT 'Berhampur',
    user_agent TEXT,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EMAIL OTPS TABLE (6-Digit OTP Email Verification)
CREATE TABLE IF NOT EXISTS email_otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    otp_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUDIT LOGS TABLE (Comprehensive Security Audit Logging)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    admin_email TEXT,
    action TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    browser TEXT,
    os TEXT,
    country TEXT DEFAULT 'India',
    city TEXT DEFAULT 'Berhampur',
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Block all direct public access; access allowed ONLY via backend service_role
-- ==============================================================================

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop old public policies if any
DROP POLICY IF EXISTS "Service Role Only Admin Access" ON admins;
DROP POLICY IF EXISTS "Service Role Only Sessions Access" ON sessions;
DROP POLICY IF EXISTS "Service Role Only OTPs Access" ON email_otps;
DROP POLICY IF EXISTS "Service Role Only Audit Logs Access" ON audit_logs;

-- Apply strict service_role policies
CREATE POLICY "Service Role Only Admin Access" ON admins FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role Only Sessions Access" ON sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role Only OTPs Access" ON email_otps FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service Role Only Audit Logs Access" ON audit_logs FOR ALL USING (auth.role() = 'service_role');
