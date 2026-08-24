-- Database Migration: Book a Call System (call_bookings)
-- Creates dedicated table for Zenemoo 30 Minute Call Bookings

CREATE TABLE IF NOT EXISTS call_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id VARCHAR(20) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  company_name TEXT NOT NULL,
  notes TEXT,
  meeting_type TEXT DEFAULT '30 Minute Meeting',
  meeting_duration INTEGER DEFAULT 30,
  booking_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'Asia/Kolkata',
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'completed', 'rejected', 'cancelled', 'no_show')),
  admin_notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_bookings_date ON call_bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_call_bookings_status ON call_bookings(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_start_time 
ON call_bookings (start_time) 
WHERE status IN ('confirmed', 'pending');

-- Extended Google Calendar & Google Meet Fields
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

CREATE INDEX IF NOT EXISTS idx_call_bookings_meeting_status ON call_bookings(meeting_status);

