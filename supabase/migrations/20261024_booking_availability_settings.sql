-- ==============================================================================
-- ZENEMOO Production Database Migration — Booking Availability & Working Hours
-- Migration: 20261024_booking_availability_settings.sql
-- Table: booking_availability_settings
-- Description: Stores admin-controlled weekly working hours, date overrides,
--              partial-day blocks, and timezone rules for the 30-minute booking system.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS booking_availability_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_name TEXT NOT NULL DEFAULT 'Default Working Hours',
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  slot_duration INTEGER NOT NULL DEFAULT 30,
  lead_buffer_minutes INTEGER NOT NULL DEFAULT 120,

  -- Weekly Schedule: 0 (Sunday) to 6 (Saturday)
  -- Stores active flag and array of non-overlapping HH:mm time ranges
  weekly_hours JSONB NOT NULL DEFAULT '{
    "0": { "day": "Sunday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "1": { "day": "Monday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "2": { "day": "Tuesday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "3": { "day": "Wednesday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "4": { "day": "Thursday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "5": { "day": "Friday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "6": { "day": "Saturday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] }
  }'::jsonb,

  -- Date Overrides: Specific calendar dates (full-day unavailable, custom hours, or blocked intervals)
  -- Structure: [
  --   {
  --     "id": "ovr_1",
  --     "date": "2026-11-05",
  --     "type": "unavailable", -- "unavailable" | "custom_hours" | "blocked_range"
  --     "is_available": false,
  --     "ranges": [],
  --     "reason": "Diwali Holiday",
  --     "created_at": "2026-10-24T00:00:00.000Z"
  --   }
  -- ]
  date_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,

  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'admin'
);

-- Fast lookup for the single active availability configuration
CREATE INDEX IF NOT EXISTS idx_booking_avail_active ON booking_availability_settings(is_active);

-- Seed default configuration if table is newly created
INSERT INTO booking_availability_settings (
  schedule_name,
  timezone,
  slot_duration,
  lead_buffer_minutes,
  weekly_hours,
  date_overrides,
  is_active,
  updated_by
)
SELECT
  'Default Working Hours',
  'Asia/Kolkata',
  30,
  120,
  '{
    "0": { "day": "Sunday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "1": { "day": "Monday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "2": { "day": "Tuesday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "3": { "day": "Wednesday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "4": { "day": "Thursday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "5": { "day": "Friday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] },
    "6": { "day": "Saturday", "active": true, "ranges": [{"start": "10:00", "end": "22:30"}] }
  }'::jsonb,
  '[]'::jsonb,
  true,
  'system_initialization'
WHERE NOT EXISTS (
  SELECT 1 FROM booking_availability_settings WHERE is_active = true
);
