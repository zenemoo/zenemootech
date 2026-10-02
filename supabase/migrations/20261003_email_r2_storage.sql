-- =====================================================================
-- ZENEMOO EMAIL STORAGE MIGRATION — NON-DESTRUCTIVE SCHEMA EXTENSION
-- SUPABASE METADATA + CLOUDFLARE R2 PRIVATE EMAIL STORAGE
-- =====================================================================
-- Description:
-- Adds nullable Cloudflare R2 reference, metadata, and status columns
-- to incoming_email_messages and email_history, followed by a safe
-- backfill of has_attachments for existing records.
-- 
-- STRICT SAFETY GUARANTEES:
-- 1. NO tables dropped.
-- 2. NO existing columns dropped or modified.
-- 3. NO existing data deleted or nulled.
-- 4. Fully backward compatible with legacy code and existing queries.
-- =====================================================================

-- 1. Extend incoming_email_messages table with R2 references
ALTER TABLE IF EXISTS incoming_email_messages
  ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS body_html_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS body_text_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS raw_email_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS attachments_r2_prefix TEXT,
  ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachments_meta JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_migration_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS storage_migrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_size_bytes BIGINT DEFAULT 0;

-- Safe backfill has_attachments for existing incoming emails with attachments
UPDATE incoming_email_messages
SET has_attachments = TRUE
WHERE attachments IS NOT NULL
  AND jsonb_typeof(attachments) = 'array'
  AND jsonb_array_length(attachments) > 0;

-- Create indexes for efficient metadata querying without table scans
CREATE INDEX IF NOT EXISTS idx_incoming_emails_storage_provider ON incoming_email_messages(storage_provider);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_migration_status ON incoming_email_messages(storage_migration_status);
CREATE INDEX IF NOT EXISTS idx_incoming_emails_has_attachments ON incoming_email_messages(has_attachments);

-- 2. Extend email_history (Sent Emails) table with R2 references
ALTER TABLE IF EXISTS email_history
  ADD COLUMN IF NOT EXISTS storage_provider TEXT DEFAULT 'supabase',
  ADD COLUMN IF NOT EXISTS body_html_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS body_text_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS raw_email_r2_key TEXT,
  ADD COLUMN IF NOT EXISTS attachments_r2_prefix TEXT,
  ADD COLUMN IF NOT EXISTS has_attachments BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attachments_meta JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS storage_migration_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS storage_migrated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS storage_size_bytes BIGINT DEFAULT 0;

-- Safe backfill has_attachments for existing sent emails with attachments
UPDATE email_history
SET has_attachments = TRUE
WHERE attachments_meta IS NOT NULL
  AND jsonb_typeof(attachments_meta) = 'array'
  AND jsonb_array_length(attachments_meta) > 0;

CREATE INDEX IF NOT EXISTS idx_email_history_storage_provider ON email_history(storage_provider);
CREATE INDEX IF NOT EXISTS idx_email_history_migration_status ON email_history(storage_migration_status);
CREATE INDEX IF NOT EXISTS idx_email_history_has_attachments ON email_history(has_attachments);
