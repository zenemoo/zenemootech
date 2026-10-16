-- ==============================================================================
-- ZENEMOO Production Cloudflare D1 Database Schema — Invoicing Architecture
-- Migration: 0001_invoices_d1_schema.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS invoice_settings (
  id TEXT PRIMARY KEY DEFAULT 'settings_main',
  legal_name TEXT NOT NULL DEFAULT 'Zenemoo',
  display_name TEXT NOT NULL DEFAULT 'Zenemoo',
  registered_address TEXT NOT NULL DEFAULT 'K. Barida, Main Road',
  city TEXT NOT NULL DEFAULT 'Ganjam',
  state TEXT NOT NULL DEFAULT 'Odisha',
  postal_code TEXT NOT NULL DEFAULT '761031',
  country TEXT NOT NULL DEFAULT 'India',
  official_email TEXT NOT NULL DEFAULT 'contact@zenemoo.in',
  contact_number TEXT NOT NULL DEFAULT '+91 9827775230',
  pan_number TEXT DEFAULT '',
  udyam_registration TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  company_logo_url TEXT DEFAULT '',
  authorized_signatory_name TEXT DEFAULT 'Prem Prasad',
  signature_image_url TEXT DEFAULT '',
  default_currency TEXT NOT NULL DEFAULT 'INR',
  default_payment_terms TEXT NOT NULL DEFAULT 'Net 15 Days',
  default_invoice_notes TEXT DEFAULT 'Thank you for partnering with Zenemoo. Payment is expected within the agreed terms.',
  default_tax_enabled INTEGER NOT NULL DEFAULT 0,
  default_tax_label TEXT DEFAULT 'GST',
  default_tax_rate REAL DEFAULT 18.00,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by TEXT DEFAULT 'system'
);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
  account_display_name TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'Current',
  ifsc_code TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  branch_address TEXT DEFAULT '',
  swift_bic_code TEXT DEFAULT '',
  payment_instructions TEXT DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(is_default);

CREATE TABLE IF NOT EXISTS invoice_clients (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  billing_email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  postal_code TEXT DEFAULT '',
  country TEXT NOT NULL DEFAULT 'India',
  pan_number TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_clients_company ON invoice_clients(company_name);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_email ON invoice_clients(billing_email);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  sequence_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'cancelled')),
  invoice_date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  service_period_start TEXT,
  service_period_end TEXT,
  invoice_period TEXT DEFAULT '',
  po_reference TEXT DEFAULT '',
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal REAL NOT NULL DEFAULT 0.0,
  discount_type TEXT DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value REAL DEFAULT 0.0,
  discount_amount REAL DEFAULT 0.0,
  tax_enabled INTEGER NOT NULL DEFAULT 0,
  tax_label TEXT DEFAULT 'GST',
  tax_rate REAL DEFAULT 0.0,
  tax_amount REAL DEFAULT 0.0,
  total_amount REAL NOT NULL DEFAULT 0.0,
  amount_in_words TEXT NOT NULL DEFAULT '',
  amount_paid REAL NOT NULL DEFAULT 0.0,
  outstanding_balance REAL NOT NULL DEFAULT 0.0,
  project_name TEXT NOT NULL DEFAULT '',
  project_description TEXT DEFAULT '',
  line_items TEXT NOT NULL DEFAULT '[]',
  client_id TEXT,
  client_snapshot TEXT NOT NULL DEFAULT '{}',
  company_snapshot TEXT NOT NULL DEFAULT '{}',
  bank_account_id TEXT,
  bank_snapshot TEXT NOT NULL DEFAULT '{}',
  payment_terms TEXT DEFAULT 'Net 15 Days',
  invoice_notes TEXT DEFAULT '',
  payment_instructions TEXT DEFAULT '',
  pdf_storage_key TEXT DEFAULT '',
  pdf_generated_at TEXT,
  created_by TEXT DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  issued_at TEXT,
  issued_by TEXT,
  cancelled_at TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT DEFAULT '',
  paid_at TEXT,
  paid_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_year_seq ON invoices(sequence_year, sequence_number);

CREATE TABLE IF NOT EXISTS invoice_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_date TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  recorded_by TEXT DEFAULT 'admin',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

CREATE TABLE IF NOT EXISTS invoice_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
