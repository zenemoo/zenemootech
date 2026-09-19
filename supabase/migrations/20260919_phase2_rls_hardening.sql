-- ==============================================================================
-- ZENEMOO Production Safe Migration: Phase 2 Supabase RLS Hardening
-- Additive, Non-destructive, Idempotent
-- Protects all sensitive tables from direct anon key exploitation
-- Preserves backend service-role operations and public workflows
-- ==============================================================================

-- 1. Enable Row Level Security on all core and sensitive tables
ALTER TABLE IF EXISTS talent_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS talent_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS opportunity_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS call_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS support_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS authorized_admin_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scheduled_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS incoming_email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_profile_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profile_image_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Clean up obsolete overly-permissive policies if present
DO $$
BEGIN
  -- Obsolete permissive policies from earlier scripts
  DROP POLICY IF EXISTS "Allow public backend access to user_accounts" ON user_accounts;
  DROP POLICY IF EXISTS "Allow public backend access to pending_profile_updates" ON pending_profile_updates;
  DROP POLICY IF EXISTS "Allow public backend access to profile_image_logs" ON profile_image_logs;
  DROP POLICY IF EXISTS "Allow public backend access to notifications" ON notifications;
  DROP POLICY IF EXISTS "Allow public backend access to user_notifications" ON user_notifications;
END $$;

-- 3. Explicit service_role grants (Ensures zero backend interruption)
-- Note: Supabase bypasses RLS for service_role automatically, but explicit policies guarantee safety.

-- ==============================================================================
-- 4. TALENT REGISTRATIONS
-- ==============================================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "talent_reg_public_insert" ON talent_registrations;
  DROP POLICY IF EXISTS "talent_reg_owner_select" ON talent_registrations;
  DROP POLICY IF EXISTS "talent_reg_owner_update" ON talent_registrations;
  DROP POLICY IF EXISTS "talent_reg_service_all" ON talent_registrations;

  -- Allow public / anon candidate registrations
  CREATE POLICY "talent_reg_public_insert" ON talent_registrations
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  -- Authenticated talent users can only view their own profile
  CREATE POLICY "talent_reg_owner_select" ON talent_registrations
    FOR SELECT TO authenticated
    USING (
      email = (auth.jwt() ->> 'email')
    );

  -- Authenticated talent users can only update their own profile
  CREATE POLICY "talent_reg_owner_update" ON talent_registrations
    FOR UPDATE TO authenticated
    USING (
      email = (auth.jwt() ->> 'email')
    )
    WITH CHECK (
      email = (auth.jwt() ->> 'email')
    );

  -- Service role full access
  CREATE POLICY "talent_reg_service_all" ON talent_registrations
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 5. TALENT LANGUAGES & EXPERIENCES
-- ==============================================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "talent_lang_public_insert" ON talent_languages;
  DROP POLICY IF EXISTS "talent_lang_owner_select" ON talent_languages;
  DROP POLICY IF EXISTS "talent_lang_service_all" ON talent_languages;

  CREATE POLICY "talent_lang_public_insert" ON talent_languages
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "talent_lang_owner_select" ON talent_languages
    FOR SELECT TO authenticated
    USING (
      registration_id IN (
        SELECT id FROM talent_registrations WHERE email = (auth.jwt() ->> 'email')
      )
    );

  CREATE POLICY "talent_lang_service_all" ON talent_languages
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- talent_experiences
  DROP POLICY IF EXISTS "talent_exp_public_insert" ON talent_experiences;
  DROP POLICY IF EXISTS "talent_exp_owner_select" ON talent_experiences;
  DROP POLICY IF EXISTS "talent_exp_service_all" ON talent_experiences;

  CREATE POLICY "talent_exp_public_insert" ON talent_experiences
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "talent_exp_owner_select" ON talent_experiences
    FOR SELECT TO authenticated
    USING (
      registration_id IN (
        SELECT id FROM talent_registrations WHERE email = (auth.jwt() ->> 'email')
      )
    );

  CREATE POLICY "talent_exp_service_all" ON talent_experiences
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- talent_supported_languages (public read dropdown directory)
  DROP POLICY IF EXISTS "supported_lang_public_select" ON talent_supported_languages;
  DROP POLICY IF EXISTS "supported_lang_service_all" ON talent_supported_languages;

  CREATE POLICY "supported_lang_public_select" ON talent_supported_languages
    FOR SELECT TO anon, authenticated
    USING (status = 'active');

  CREATE POLICY "supported_lang_service_all" ON talent_supported_languages
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 6. TALENT TEAM MEMBERS
-- ==============================================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "team_members_owner_select" ON talent_team_members;
  DROP POLICY IF EXISTS "team_members_owner_mutate" ON talent_team_members;
  DROP POLICY IF EXISTS "team_members_service_all" ON talent_team_members;

  -- Vendor owner can view their team members
  CREATE POLICY "team_members_owner_select" ON talent_team_members
    FOR SELECT TO authenticated
    USING (
      vendor_registration_id IN (
        SELECT id FROM talent_registrations WHERE email = (auth.jwt() ->> 'email')
      )
      OR email = (auth.jwt() ->> 'email')
    );

  -- Vendor owner can manage their team members
  CREATE POLICY "team_members_owner_mutate" ON talent_team_members
    FOR ALL TO authenticated
    USING (
      vendor_registration_id IN (
        SELECT id FROM talent_registrations WHERE email = (auth.jwt() ->> 'email')
      )
    )
    WITH CHECK (
      vendor_registration_id IN (
        SELECT id FROM talent_registrations WHERE email = (auth.jwt() ->> 'email')
      )
    );

  CREATE POLICY "team_members_service_all" ON talent_team_members
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 7. OPPORTUNITIES & APPLICATIONS
-- ==============================================================================
DO $$
BEGIN
  -- opportunities: Public can read active opportunities
  DROP POLICY IF EXISTS "opp_public_select" ON opportunities;
  DROP POLICY IF EXISTS "opp_service_all" ON opportunities;

  CREATE POLICY "opp_public_select" ON opportunities
    FOR SELECT TO anon, authenticated
    USING (status IN ('active', 'coming_soon'));

  CREATE POLICY "opp_service_all" ON opportunities
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- opportunity_applications: Public can insert application, applicant can view own
  DROP POLICY IF EXISTS "opp_app_public_insert" ON opportunity_applications;
  DROP POLICY IF EXISTS "opp_app_owner_select" ON opportunity_applications;
  DROP POLICY IF EXISTS "opp_app_service_all" ON opportunity_applications;

  CREATE POLICY "opp_app_public_insert" ON opportunity_applications
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "opp_app_owner_select" ON opportunity_applications
    FOR SELECT TO authenticated
    USING (
      applicant_email = (auth.jwt() ->> 'email')
    );

  CREATE POLICY "opp_app_service_all" ON opportunity_applications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 8. SUBSCRIBERS & CONTACTS & CALL BOOKINGS
-- ==============================================================================
DO $$
BEGIN
  -- subscribers
  DROP POLICY IF EXISTS "subs_public_insert" ON subscribers;
  DROP POLICY IF EXISTS "subs_service_all" ON subscribers;

  CREATE POLICY "subs_public_insert" ON subscribers
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "subs_service_all" ON subscribers
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- contacts
  DROP POLICY IF EXISTS "contacts_public_insert" ON contacts;
  DROP POLICY IF EXISTS "contacts_service_all" ON contacts;

  CREATE POLICY "contacts_public_insert" ON contacts
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "contacts_service_all" ON contacts
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- call_bookings
  DROP POLICY IF EXISTS "bookings_public_insert" ON call_bookings;
  DROP POLICY IF EXISTS "bookings_service_all" ON call_bookings;

  CREATE POLICY "bookings_public_insert" ON call_bookings
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "bookings_service_all" ON call_bookings
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 9. REVIEWS & SUPPORT PAYMENTS
-- ==============================================================================
DO $$
BEGIN
  -- reviews: public can read approved reviews and submit new pending reviews
  DROP POLICY IF EXISTS "reviews_public_select" ON reviews;
  DROP POLICY IF EXISTS "reviews_public_insert" ON reviews;
  DROP POLICY IF EXISTS "reviews_service_all" ON reviews;

  CREATE POLICY "reviews_public_select" ON reviews
    FOR SELECT TO anon, authenticated
    USING (is_visible = true);

  CREATE POLICY "reviews_public_insert" ON reviews
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

  CREATE POLICY "reviews_service_all" ON reviews
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- support_payments: only owner or service_role
  DROP POLICY IF EXISTS "payments_owner_select" ON support_payments;
  DROP POLICY IF EXISTS "payments_service_all" ON support_payments;

  CREATE POLICY "payments_owner_select" ON support_payments
    FOR SELECT TO authenticated
    USING (
      customer_email = (auth.jwt() ->> 'email')
      OR user_id = (auth.jwt() ->> 'sub')
    );

  CREATE POLICY "payments_service_all" ON support_payments
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 10. HIGH RISK ADMIN & INTERNAL QUEUE TABLES
-- Only service_role access. Anon and standard authenticated are strictly locked out.
-- ==============================================================================
DO $$
BEGIN
  -- authorized_admin_emails
  DROP POLICY IF EXISTS "admin_emails_service_all" ON authorized_admin_emails;
  CREATE POLICY "admin_emails_service_all" ON authorized_admin_emails
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- scheduled_emails
  DROP POLICY IF EXISTS "scheduled_emails_service_all" ON scheduled_emails;
  CREATE POLICY "scheduled_emails_service_all" ON scheduled_emails
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- incoming_email_messages
  DROP POLICY IF EXISTS "incoming_emails_service_all" ON incoming_email_messages;
  CREATE POLICY "incoming_emails_service_all" ON incoming_email_messages
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- talent_admin_notes
  DROP POLICY IF EXISTS "talent_admin_notes_service_all" ON talent_admin_notes;
  CREATE POLICY "talent_admin_notes_service_all" ON talent_admin_notes
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;

-- ==============================================================================
-- 11. RBAC & USER ACCOUNT TABLES
-- Replacing old 'USING (true)' with authenticated least-privilege policies
-- ==============================================================================
DO $$
BEGIN
  DROP POLICY IF EXISTS "user_accounts_owner_select" ON user_accounts;
  DROP POLICY IF EXISTS "user_accounts_service_all" ON user_accounts;

  CREATE POLICY "user_accounts_owner_select" ON user_accounts
    FOR SELECT TO authenticated
    USING (
      id::text = (auth.jwt() ->> 'sub')
      OR email = (auth.jwt() ->> 'email')
    );

  CREATE POLICY "user_accounts_service_all" ON user_accounts
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- pending_profile_updates
  DROP POLICY IF EXISTS "pending_updates_owner_all" ON pending_profile_updates;
  DROP POLICY IF EXISTS "pending_updates_service_all" ON pending_profile_updates;

  CREATE POLICY "pending_updates_owner_all" ON pending_profile_updates
    FOR ALL TO authenticated
    USING (
      user_id::text = (auth.jwt() ->> 'sub')
    )
    WITH CHECK (
      user_id::text = (auth.jwt() ->> 'sub')
    );

  CREATE POLICY "pending_updates_service_all" ON pending_profile_updates
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  -- notifications & user_notifications
  DROP POLICY IF EXISTS "notifications_public_broadcast" ON notifications;
  DROP POLICY IF EXISTS "notifications_service_all" ON notifications;

  CREATE POLICY "notifications_public_broadcast" ON notifications
    FOR SELECT TO authenticated
    USING (target_type = 'broadcast');

  CREATE POLICY "notifications_service_all" ON notifications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

  DROP POLICY IF EXISTS "user_notifications_owner" ON user_notifications;
  DROP POLICY IF EXISTS "user_notifications_service_all" ON user_notifications;

  CREATE POLICY "user_notifications_owner" ON user_notifications
    FOR ALL TO authenticated
    USING (
      user_id::text = (auth.jwt() ->> 'sub')
    )
    WITH CHECK (
      user_id::text = (auth.jwt() ->> 'sub')
    );

  CREATE POLICY "user_notifications_service_all" ON user_notifications
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);
END $$;
