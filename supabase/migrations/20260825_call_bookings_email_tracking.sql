-- Database Migration: Add Email Tracking Fields to call_bookings
ALTER TABLE call_bookings 
  ADD COLUMN IF NOT EXISTS customer_email_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_email_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_reminder_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS admin_reminder_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS customer_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_email_error TEXT,
  ADD COLUMN IF NOT EXISTS admin_email_error TEXT,
  ADD COLUMN IF NOT EXISTS customer_reminder_error TEXT,
  ADD COLUMN IF NOT EXISTS admin_reminder_error TEXT;
