-- ============================================================================
-- Migration: 0001_create_pools.sql
-- Cloudflare D1 Relational Schema for Zenemoo Quick Talent Interest Pool System
-- ============================================================================

-- 1. Pools Table
CREATE TABLE IF NOT EXISTS pools (
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  allow_multiple INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  start_time TEXT,
  end_time TEXT,
  total_responses_count INTEGER NOT NULL DEFAULT 0,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_by TEXT NOT NULL DEFAULT 'admin@zenemoo.in',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Pool Options Table
CREATE TABLE IF NOT EXISTS pool_options (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL,
  option_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  response_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE
);

-- 3. Pool Responses Table
CREATE TABLE IF NOT EXISTS pool_responses (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  participant_type TEXT NOT NULL DEFAULT 'Individual',
  custom_text TEXT,
  source TEXT NOT NULL DEFAULT 'public_web',
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (pool_id) REFERENCES pools(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES pool_options(id) ON DELETE CASCADE
);

-- ============================================================================
-- Indexes & Unique Constraints
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_pools_public_id ON pools (public_id);
CREATE INDEX IF NOT EXISTS idx_pools_status_active ON pools (status, is_archived);
CREATE INDEX IF NOT EXISTS idx_pools_created_at ON pools (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pool_options_pool_id ON pool_options (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_options_sort_order ON pool_options (pool_id, sort_order ASC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pool_responses_unique ON pool_responses (pool_id, email, option_id);
CREATE INDEX IF NOT EXISTS idx_pool_responses_pool_id ON pool_responses (pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_responses_email ON pool_responses (email);
CREATE INDEX IF NOT EXISTS idx_pool_responses_pool_email ON pool_responses (pool_id, email);
CREATE INDEX IF NOT EXISTS idx_pool_responses_created_at ON pool_responses (created_at DESC);

-- ============================================================================
-- Default Starter Pools (Seed data for immediate production readiness)
-- ============================================================================
INSERT OR IGNORE INTO pools (id, public_id, title, description, category, allow_multiple, status, start_time, end_time, total_responses_count, is_archived, created_by, created_at, updated_at)
VALUES 
(
  '7f4k2m91-0000-4000-8000-000000000001',
  'ZNM-PL-7F4K2M91',
  'What type of AI data work are you interested in?',
  'Tell Zenemoo your interests and skills so we can contact you as soon as matching projects and gigs open up.',
  'AI Data Solutions',
  0,
  'published',
  datetime('now', '-1 day'),
  NULL,
  0,
  0,
  'admin@zenemoo.in',
  datetime('now', '-1 day'),
  datetime('now')
),
(
  '7f4k2m91-0000-4000-8000-000000000002',
  'ZNM-PL-9A3B5C7D',
  'Which domains can you or your agency contribute to?',
  'Select all project areas you or your team have capability or experience in delivering.',
  'Enterprise Capabilities',
  1,
  'published',
  datetime('now', '-1 day'),
  NULL,
  0,
  0,
  'admin@zenemoo.in',
  datetime('now', '-1 day'),
  datetime('now')
);

INSERT OR IGNORE INTO pool_options (id, pool_id, option_text, sort_order, response_count, created_at)
VALUES
('opt-101', '7f4k2m91-0000-4000-8000-000000000001', 'Audio Recording & Transcription', 0, 0, datetime('now')),
('opt-102', '7f4k2m91-0000-4000-8000-000000000001', 'Text Translation & Localization', 1, 0, datetime('now')),
('opt-103', '7f4k2m91-0000-4000-8000-000000000001', 'Image & Video Annotation', 2, 0, datetime('now')),
('opt-104', '7f4k2m91-0000-4000-8000-000000000001', 'LLM Prompt & Response Evaluation', 3, 0, datetime('now')),
('opt-105', '7f4k2m91-0000-4000-8000-000000000001', 'Regional Dialects Voice Actor', 4, 0, datetime('now')),
('opt-106', '7f4k2m91-0000-4000-8000-000000000001', 'Other', 5, 0, datetime('now')),

('opt-201', '7f4k2m91-0000-4000-8000-000000000002', 'Audio & Speech Processing', 0, 0, datetime('now')),
('opt-202', '7f4k2m91-0000-4000-8000-000000000002', 'Indic & Regional Language Translation', 1, 0, datetime('now')),
('opt-203', '7f4k2m91-0000-4000-8000-000000000002', 'Computer Vision & Bounding Boxes', 2, 0, datetime('now')),
('opt-204', '7f4k2m91-0000-4000-8000-000000000002', 'Text Sentiment & Content Moderation', 3, 0, datetime('now')),
('opt-205', '7f4k2m91-0000-4000-8000-000000000002', 'Other', 4, 0, datetime('now'));
