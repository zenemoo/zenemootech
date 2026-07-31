-- ==============================================================================
-- ZENEMOO Production Database Migration — RBAC, User Accounts & Notifications
-- Single Source of Truth: Existing 'team' table is referenced via team_member_id.
-- No duplicate employee tables are created.
-- ==============================================================================

-- 1. Create Table: user_accounts
CREATE TABLE IF NOT EXISTS user_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'team_member', -- admin, hr, team_member, manager, finance, qa_lead, project_lead
  status TEXT NOT NULL DEFAULT 'active', -- active, disabled
  email_access BOOLEAN NOT NULL DEFAULT false, -- HR email module permission
  notification_access BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  password_changed BOOLEAN NOT NULL DEFAULT false, -- Triggers forced change if initial default Team@123
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup on email and team_member_id
CREATE INDEX IF NOT EXISTS idx_user_accounts_email ON user_accounts(email);
CREATE INDEX IF NOT EXISTS idx_user_accounts_team_member ON user_accounts(team_member_id);

-- 2. Create Table: profile_image_logs (Enforces 7-day profile picture update rule)
CREATE TABLE IF NOT EXISTS profile_image_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  team_member_id UUID REFERENCES team(id) ON DELETE CASCADE,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  next_allowed_upload TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  image_url TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profile_image_logs_user ON profile_image_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_image_logs_team ON profile_image_logs(team_member_id);

-- 3. Create Table: notifications (Admin system and individual notifications)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info', -- info, success, warning, error, payment, meeting, project, system
  target_type TEXT NOT NULL DEFAULT 'broadcast', -- broadcast, individual, role
  target_user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  target_role TEXT, -- e.g. hr, team_member
  sender_id UUID REFERENCES user_accounts(id) ON DELETE SET NULL,
  sender_email TEXT DEFAULT 'contact@zenemoo.in',
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_target_user ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

-- 4. Create Table: user_notifications (Per-user delivery & unread tracking)
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_read ON user_notifications(is_read);

-- 5. Create Table: password_history (Security history tracking)
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_accounts(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- RLS Security Policies (Supabase Row Level Security)
-- ==============================================================================

ALTER TABLE user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_image_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Allow service role / anon full backend access (Backend acts as authority via JWT)
CREATE POLICY "Allow public backend access to user_accounts" ON user_accounts FOR ALL USING (true);
CREATE POLICY "Allow public backend access to profile_image_logs" ON profile_image_logs FOR ALL USING (true);
CREATE POLICY "Allow public backend access to notifications" ON notifications FOR ALL USING (true);
CREATE POLICY "Allow public backend access to user_notifications" ON user_notifications FOR ALL USING (true);
