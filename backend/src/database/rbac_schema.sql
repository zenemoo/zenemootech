-- ==============================================================================
-- ZENEMOO Production Database Migration — RBAC, User Accounts & Approvals
-- Idempotent Migration: Safely adds missing columns and approval tables if existing.
-- Single Source of Truth: Existing 'team' table is referenced via team_member_id.
-- ==============================================================================

-- 1. Base Table: user_accounts
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member',
  status TEXT NOT NULL DEFAULT 'active',
  email_access BOOLEAN NOT NULL DEFAULT false,
  notification_access BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  password_changed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure team_member_id and all required columns exist
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team(id) ON DELETE SET NULL;
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'team_member';
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS email_access BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS notification_access BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS password_changed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_accounts ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_team_member ON user_accounts(team_member_id);

-- 2. Base Table: pending_profile_updates (Admin approval workflow for profile edits)
CREATE TABLE IF NOT EXISTS pending_profile_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  employee_name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  requested_changes JSONB NOT NULL, -- { bio, image_url, skills, languages, linkedin, github, twitter, phone, portfolio }
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_updates_status ON pending_profile_updates(status);
CREATE INDEX IF NOT EXISTS idx_pending_updates_team ON pending_profile_updates(team_member_id);

-- 3. Base Table: profile_image_logs (Enforces 7-day profile picture update rule)
CREATE TABLE IF NOT EXISTS profile_image_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  next_allowed_upload TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  image_url TEXT NOT NULL
);

ALTER TABLE profile_image_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE;
ALTER TABLE profile_image_logs ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team(id) ON DELETE CASCADE;
ALTER TABLE profile_image_logs ADD COLUMN IF NOT EXISTS next_allowed_upload TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
ALTER TABLE profile_image_logs ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profile_image_logs_user ON profile_image_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_image_logs_team ON profile_image_logs(team_member_id);

-- 4. Base Table: notifications (Admin system and individual notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  target_type TEXT NOT NULL DEFAULT 'broadcast',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_type TEXT NOT NULL DEFAULT 'broadcast';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_email TEXT DEFAULT 'contact@zenemoo.in';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 5. Base Table: user_notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(is_read);

-- 6. Base Table: password_history
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- RLS Security Policies
-- ==============================================================================

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_profile_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_image_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public backend access to user_accounts" ON user_accounts;
DROP POLICY IF EXISTS "Allow public backend access to pending_profile_updates" ON pending_profile_updates;
DROP POLICY IF EXISTS "Allow public backend access to profile_image_logs" ON profile_image_logs;
DROP POLICY IF EXISTS "Allow public backend access to notifications" ON notifications;
DROP POLICY IF EXISTS "Allow public backend access to user_notifications" ON user_notifications;

CREATE POLICY "Allow public backend access to user_accounts" ON user_accounts FOR ALL USING (true);
CREATE POLICY "Allow public backend access to pending_profile_updates" ON pending_profile_updates FOR ALL USING (true);
CREATE POLICY "Allow public backend access to profile_image_logs" ON profile_image_logs FOR ALL USING (true);
CREATE POLICY "Allow public backend access to notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow public backend access to user_notifications" ON user_notifications FOR ALL USING (true);
