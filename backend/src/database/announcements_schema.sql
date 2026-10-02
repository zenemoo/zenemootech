-- ==============================================================================
-- Cloudflare D1 Announcement Table Schema Migration
-- Database: zenemoo-portfolio / zenemoo-payments (Cloudflare D1)
-- Table: announcements
-- Description: Lightweight public ticker & announcement management storage
-- ==============================================================================

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT,
  message TEXT NOT NULL,
  link_url TEXT,
  link_text TEXT,
  icon TEXT DEFAULT '✦',
  active INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  start_at TEXT,
  end_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(active);
CREATE INDEX IF NOT EXISTS idx_announcements_start_at ON announcements(start_at);
CREATE INDEX IF NOT EXISTS idx_announcements_end_at ON announcements(end_at);
CREATE INDEX IF NOT EXISTS idx_announcements_sort_order ON announcements(sort_order);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
