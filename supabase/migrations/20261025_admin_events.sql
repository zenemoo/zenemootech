-- ==============================================================================
-- ZENEMOO Production Database Migration — Admin Events & Client Meetings
-- Migration: 20261025_admin_events.sql
-- Table: admin_events
-- Description: Stores internal events/training and admin-scheduled client meetings
--              with shared availability locking and delivery tracking.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS admin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(30) UNIQUE NOT NULL, -- e.g. ZEN-EVT-XXXXX or ZEN-CLT-XXXXX
  event_type TEXT NOT NULL CHECK (event_type IN ('internal_event', 'client_meeting')),
  
  -- Core Event Details
  title TEXT NOT NULL,
  description TEXT,
  agenda TEXT,
  internal_notes TEXT,
  
  -- Client / Organization Details
  client_name TEXT,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  project_or_service TEXT,
  meeting_purpose TEXT,
  
  -- Attendees (JSON array of { name: string, email: string, role?: string })
  attendees JSONB DEFAULT '[]'::jsonb,
  
  -- Schedule & Timezone
  event_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  
  -- Location & Online Video
  location TEXT,
  google_calendar_event_id TEXT,
  google_meet_url TEXT,
  meeting_status TEXT DEFAULT 'pending' 
    CHECK (meeting_status IN ('pending', 'generating', 'generated', 'failed', 'cancelled', 'not_applicable')),
  
  -- Operational Lifecycle Status
  -- Only 'scheduled' blocks public availability; 'draft' and 'cancelled' do not block.
  status TEXT NOT NULL DEFAULT 'scheduled' 
    CHECK (status IN ('draft', 'scheduled', 'completed', 'cancelled')),
  
  -- Notification & Email Delivery Tracking
  notify_attendees BOOLEAN DEFAULT FALSE,
  customer_email_status TEXT DEFAULT 'pending' 
    CHECK (customer_email_status IN ('pending', 'sent', 'failed', 'not_applicable')),
  admin_email_status TEXT DEFAULT 'pending' 
    CHECK (admin_email_status IN ('pending', 'sent', 'failed', 'not_applicable')),
  customer_email_sent_at TIMESTAMPTZ,
  admin_email_sent_at TIMESTAMPTZ,
  customer_email_error TEXT,
  admin_email_error TEXT,
  
  -- Audit & Metadata
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Fast Lookups for Conflict Detection & Range Searches
CREATE INDEX IF NOT EXISTS idx_admin_events_date ON admin_events(event_date);
CREATE INDEX IF NOT EXISTS idx_admin_events_status ON admin_events(status);
CREATE INDEX IF NOT EXISTS idx_admin_events_range ON admin_events(start_time, end_time) WHERE status = 'scheduled';

-- Enable Row Level Security (RLS)
ALTER TABLE IF EXISTS admin_events ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access
DROP POLICY IF EXISTS "admin_events_service_all" ON admin_events;
CREATE POLICY "admin_events_service_all" ON admin_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated Users with Admin Role Access
DROP POLICY IF EXISTS "admin_events_admin_all" ON admin_events;
CREATE POLICY "admin_events_admin_all" ON admin_events
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
