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
