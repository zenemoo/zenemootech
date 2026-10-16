-- ==============================================================================
-- ZENEMOO Production Database Migration — Invoice Generator Architecture
-- Comprehensive schema for Zenemoo Admin Invoice Generator
-- ==============================================================================

-- 1. Company & Global Invoice Settings Table
CREATE TABLE IF NOT EXISTS invoice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  default_tax_enabled BOOLEAN DEFAULT false,
  default_tax_label TEXT DEFAULT 'GST',
  default_tax_rate NUMERIC(5, 2) DEFAULT 18.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT DEFAULT 'system'
);

-- 2. Bank Accounts Table (Multiple Accounts Support)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_active ON bank_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_default ON bank_accounts(is_default);

-- 3. Saved Clients Table (Reusable Clients)
CREATE TABLE IF NOT EXISTS invoice_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  billing_email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  pan_number TEXT DEFAULT '',
  gstin TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_clients_company ON invoice_clients(company_name);
CREATE INDEX IF NOT EXISTS idx_invoice_clients_email ON invoice_clients(billing_email);

-- 4. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  sequence_year INTEGER NOT NULL,
  sequence_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'partially_paid', 'cancelled')),
  
  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  service_period_start DATE,
  service_period_end DATE,
  invoice_period TEXT DEFAULT '',
  po_reference TEXT DEFAULT '',

  -- Currency & Financial Totals
  currency TEXT NOT NULL DEFAULT 'INR',
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount_type TEXT DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value NUMERIC(12, 2) DEFAULT 0.00,
  discount_amount NUMERIC(12, 2) DEFAULT 0.00,
  tax_enabled BOOLEAN DEFAULT false,
  tax_label TEXT DEFAULT 'GST',
  tax_rate NUMERIC(5, 2) DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) DEFAULT 0.00,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_in_words TEXT NOT NULL DEFAULT '',
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  outstanding_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,

  -- Project & Line Items
  project_name TEXT NOT NULL DEFAULT '',
  project_description TEXT DEFAULT '',
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Permanent Snapshots (Preserved exactly as issued)
  client_id UUID REFERENCES invoice_clients(id) ON DELETE SET NULL,
  client_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  company_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  bank_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Notes & Instructions
  payment_terms TEXT DEFAULT 'Net 15 Days',
  invoice_notes TEXT DEFAULT '',
  payment_instructions TEXT DEFAULT '',

  -- PDF Storage Reference
  pdf_storage_key TEXT DEFAULT '',
  pdf_generated_at TIMESTAMPTZ,

  -- Audit & Lifecycle Tracking
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  issued_at TIMESTAMPTZ,
  issued_by TEXT,
  cancelled_at TIMESTAMPTZ,
  cancelled_by TEXT,
  cancellation_reason TEXT DEFAULT '',
  paid_at TIMESTAMPTZ,
  paid_by TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_year_seq ON invoices(sequence_year, sequence_number);

-- 5. Invoice Payments Table (Audit trail of payments recorded against invoices)
CREATE TABLE IF NOT EXISTS invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer',
  reference_number TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  recorded_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice ON invoice_payments(invoice_id);

-- 6. Atomic Invoice Sequence Tracker for Concurrency Safety
CREATE TABLE IF NOT EXISTS invoice_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
