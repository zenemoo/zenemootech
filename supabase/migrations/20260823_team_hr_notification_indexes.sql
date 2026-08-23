-- Supabase Migration: Zenemoo Team & HR Push Notification Isolation & Indexing
-- Ensures clean filtering by app_type ('team_hr' vs 'zenemoo' vs 'website') without breaking existing production data.

-- 1. Create Index for record_type and app_type lookups
CREATE INDEX IF NOT EXISTS idx_zenemoo_notifications_app_type 
ON zenemoo_notifications(app_type);

-- 2. Create Composite Index for fast active subscription resolution
CREATE INDEX IF NOT EXISTS idx_zenemoo_notifications_active_subs 
ON zenemoo_notifications(record_type, platform, app_type, is_active);

-- 3. Create Composite Index for user subscription lookup
CREATE INDEX IF NOT EXISTS idx_zenemoo_notifications_user_app 
ON zenemoo_notifications(user_id, app_type, platform);
