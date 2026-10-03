-- Migration: 0002_public_payment_receipts.sql
-- Dedicated storage for public payment receipts accessible by any browser / device

CREATE TABLE IF NOT EXISTS public_payment_receipts (
  id TEXT PRIMARY KEY,
  zenemoo_payment_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Pending',
  name TEXT NOT NULL,
  masked_upi_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  project_name TEXT,
  work_type TEXT NOT NULL DEFAULT 'Annotator',
  utr TEXT,
  payment_date TEXT,
  batch_id TEXT,
  proof_link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_public_receipts_zenemoo_id ON public_payment_receipts (zenemoo_payment_id);
CREATE INDEX IF NOT EXISTS idx_public_receipts_status ON public_payment_receipts (status);
CREATE INDEX IF NOT EXISTS idx_public_receipts_batch_id ON public_payment_receipts (batch_id);
CREATE INDEX IF NOT EXISTS idx_public_receipts_utr ON public_payment_receipts (utr);
