-- Migration: Add Telegram Password Recovery columns to authorized_admin_emails
ALTER TABLE authorized_admin_emails 
ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT,
ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMPTZ;
