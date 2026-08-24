-- Database Migration: Google Calendar & Google Meet Integration for call_bookings
-- Safely alters the existing call_bookings table without dropping or deleting data

ALTER TABLE call_bookings 
  ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'pending' 
    CHECK (meeting_status IN ('pending', 'generating', 'generated', 'failed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS google_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS google_meet_url TEXT,
  ADD COLUMN IF NOT EXISTS meeting_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS meeting_attempt_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meeting_error TEXT,
  ADD COLUMN IF NOT EXISTS meeting_generation_source TEXT DEFAULT 'automatic',
  ADD COLUMN IF NOT EXISTS meeting_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Index for meeting status lookup & background processing
CREATE INDEX IF NOT EXISTS idx_call_bookings_meeting_status ON call_bookings(meeting_status);
