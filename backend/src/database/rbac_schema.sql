-- ==============================================================================
-- Zenemoo Enterprise RBAC, Team Member Portal & HR Portal Database Migration
-- Target: Supabase PostgreSQL Database
-- ==============================================================================

-- 1. Create App Users Table for Multi-Portal Authentication & Role Management
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member', -- 'admin', 'hr', 'team_member', 'manager', 'finance', 'qa_lead', 'project_lead'
  designation TEXT DEFAULT 'Specialist',
  department TEXT DEFAULT 'Engineering',
  employee_id TEXT UNIQUE,
  joining_date TEXT,
  bio TEXT DEFAULT '',
  image_url TEXT DEFAULT '/assets/executive.png',
  skills TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{}',
  linkedin TEXT DEFAULT '',
  github TEXT DEFAULT '',
  twitter TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{"email_access": false}',
  last_login_at TIMESTAMPTZ,
  last_image_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Profile Image Logs Table (Enforces 7-Day Upload Rate Limit)
CREATE TABLE IF NOT EXISTS profile_image_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  next_allowed_upload TIMESTAMPTZ NOT NULL,
  image_url TEXT NOT NULL
);

-- 3. Create System Notifications Table (Broadcast & Individual Notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error', 'payment', 'meeting', 'project', 'system'
  target_type TEXT NOT NULL DEFAULT 'broadcast', -- 'broadcast' or 'individual'
  target_user_id TEXT, -- NULL for broadcast, else app_users.id
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create User Notifications Status Table (Tracks read/delete state per user)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(notification_id, user_id)
);

-- Indexing for fast performance
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, is_read);
