-- ZENEMOO Unified Notification System — Single Supabase Table Schema
-- Table Name: zenemoo_notifications

CREATE TABLE IF NOT EXISTS zenemoo_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core discriminator: 'subscription' OR 'notification'
  record_type TEXT NOT NULL DEFAULT 'notification',
  
  -- Fields for Subscription records (record_type = 'subscription')
  platform TEXT, -- 'android' or 'web'
  app_type TEXT DEFAULT 'zenemoo', -- 'zenemoo', 'zenemoo_admin', 'website', 'team_portal', 'hr_portal'
  installation_id TEXT, -- Stable client/browser/device UUID
  token TEXT, -- FCM Token or WebPush endpoint
  subscription JSONB DEFAULT '{}', -- Full Web Push keys { endpoint, keys: { p256dh, auth } }
  user_id TEXT, -- Optional logged-in user ID
  user_role TEXT, -- Optional user role ('admin', 'hr', 'team_member')
  app_version TEXT, -- Client application version
  permission_status TEXT DEFAULT 'granted',
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Fields for Notification records (record_type = 'notification')
  notification_type TEXT DEFAULT 'general', -- 'opportunity_published', 'app_update', 'announcement', 'general', 'system'
  title TEXT,
  message TEXT,
  target_type TEXT DEFAULT 'broadcast', -- 'broadcast', 'app_users', 'web_users', 'team', 'hr', 'admin', 'individual'
  target_id TEXT,
  url TEXT, -- Deep link or website target path (e.g., '/opportunities/123')
  opportunity_id TEXT,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast queries and efficient free-tier storage
CREATE INDEX IF NOT EXISTS idx_zn_record_type ON zenemoo_notifications(record_type);
CREATE INDEX IF NOT EXISTS idx_zn_sub_lookup ON zenemoo_notifications(record_type, platform, installation_id, app_type);
CREATE INDEX IF NOT EXISTS idx_zn_active_subs ON zenemoo_notifications(record_type, is_active, platform, app_type);
CREATE INDEX IF NOT EXISTS idx_zn_created_at ON zenemoo_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zn_target ON zenemoo_notifications(target_type, target_id);

-- Enforce strict uniqueness per platform + app_type + installation_id for subscription records
CREATE UNIQUE INDEX IF NOT EXISTS idx_zn_unique_sub 
ON zenemoo_notifications(platform, app_type, installation_id) 
WHERE record_type = 'subscription';
