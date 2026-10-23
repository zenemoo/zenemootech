-- ==============================================================================
-- ZENEMOO Production Database Migration — Scheduler Enhancements & Index Optimization
-- Migration: 20261026_scheduler_enhancements.sql
-- Description: Adds separate 1-hour reminder email tracking columns to admin_events
--              and adds targeted composite indexes to call_bookings and admin_events
--              to minimize Supabase query overhead and prevent full table scans.
-- ==============================================================================

-- 1. Add Client Meeting 1-Hour Reminder Tracking Columns to admin_events
ALTER TABLE IF EXISTS admin_events 
  ADD COLUMN IF NOT EXISTS customer_reminder_status TEXT DEFAULT 'pending' 
    CHECK (customer_reminder_status IN ('pending', 'claimed', 'sent', 'failed', 'not_applicable')),
  ADD COLUMN IF NOT EXISTS admin_reminder_status TEXT DEFAULT 'pending' 
    CHECK (admin_reminder_status IN ('pending', 'claimed', 'sent', 'failed', 'not_applicable')),
  ADD COLUMN IF NOT EXISTS customer_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_reminder_error TEXT,
  ADD COLUMN IF NOT EXISTS admin_reminder_error TEXT;

-- 2. Performance & Egress Optimization Indexes

-- Index for 1-hour reminder background scheduler on admin_events (Scans only scheduled client meetings)
CREATE INDEX IF NOT EXISTS idx_admin_events_reminder_scan 
  ON admin_events (status, customer_reminder_status, start_time) 
  WHERE status = 'scheduled' AND event_type = 'client_meeting';

-- Index for public availability queries on admin_events (Date + status)
CREATE INDEX IF NOT EXISTS idx_admin_events_date_status 
  ON admin_events (event_date, status);

-- Index for range queries during interval conflict checks
CREATE INDEX IF NOT EXISTS idx_admin_events_range_status 
  ON admin_events (start_time, end_time) 
  WHERE status = 'scheduled';

-- Index for public availability queries on call_bookings (Date + status)
CREATE INDEX IF NOT EXISTS idx_call_bookings_date_status 
  ON call_bookings (booking_date, status);

-- Index for 1-hour reminder scheduler on call_bookings
CREATE INDEX IF NOT EXISTS idx_call_bookings_reminder_scan 
  ON call_bookings (status, reminder_sent, start_time) 
  WHERE status = 'confirmed';

-- Index for server-side pagination and sorting by start_time
CREATE INDEX IF NOT EXISTS idx_call_bookings_pagination 
  ON call_bookings (start_time DESC);

CREATE INDEX IF NOT EXISTS idx_admin_events_pagination 
  ON admin_events (start_time DESC);
