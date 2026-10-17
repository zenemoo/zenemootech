-- ==============================================================================
-- ZENEMOO Production Cloudflare D1 Database Schema — Invoicing Architecture
-- Migration: 0003_lock_authentic_settings_and_banks.sql
-- Permanently locks authentic legal registrations (PAN IDWPP3025F, UDYAM-OD-11-0124893),
-- genuine handwritten signature, and genuine settlement bank accounts (SBI & IOB).
-- Completely purges any legacy or test mock presets.
-- ==============================================================================

-- 1. Purge any mock bank accounts
DELETE FROM bank_accounts
WHERE ifsc_code = 'HDFC0001234'
   OR ifsc_code = 'SBIN0001234'
   OR account_number LIKE '%8374'
   OR account_number = '50200081928374'
   OR id = '7630cf65-19a1-4568-9051-4df1bdfb7e57'
   OR id = 'bank_acc_primary'
   OR bank_name LIKE '%HDFC%';

-- 2. Ensure authentic SBI Account exists and is set as DEFAULT
INSERT INTO bank_accounts (
  id, account_display_name, account_holder_name, bank_name, account_number,
  account_type, ifsc_code, branch_name, branch_address, swift_bic_code,
  payment_instructions, is_active, is_default, created_at, updated_at
) VALUES (
  'bank_prem_sbi_7838',
  'Prem Prasad Pradhan - SBI',
  'Prem Prasad Pradhan',
  'State Bank of India',
  'XXXX7838',
  'Savings',
  'SBIN0001336',
  'Kodala Branch',
  'Kodala, Ganjam, Odisha',
  'SBININBB123',
  'Please include the invoice number in transaction remarks.',
  1,
  1,
  '2026-10-17 06:08:14',
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  account_display_name = excluded.account_display_name,
  account_holder_name = excluded.account_holder_name,
  bank_name = excluded.bank_name,
  account_number = excluded.account_number,
  account_type = excluded.account_type,
  ifsc_code = excluded.ifsc_code,
  branch_name = excluded.branch_name,
  branch_address = excluded.branch_address,
  swift_bic_code = excluded.swift_bic_code,
  payment_instructions = excluded.payment_instructions,
  is_active = 1,
  is_default = 1,
  updated_at = datetime('now');

-- 3. Ensure authentic IOB Account exists and is set as non-default
INSERT INTO bank_accounts (
  id, account_display_name, account_holder_name, bank_name, account_number,
  account_type, ifsc_code, branch_name, branch_address, swift_bic_code,
  payment_instructions, is_active, is_default, created_at, updated_at
) VALUES (
  'bank_prem_iob_9221',
  'Prem Prasad Pradhan - IOB',
  'Prem Prasad Pradhan',
  'Indian Overseas Bank',
  'XXXX9221',
  'Current',
  'IOBA0000636',
  'Begunapada Branch',
  'Begunapada, Ganjam, Odisha',
  'IOBAINBB123',
  'Please include the invoice number in transaction remarks.',
  1,
  0,
  '2026-10-17 06:08:16',
  datetime('now')
)
ON CONFLICT(id) DO UPDATE SET
  account_display_name = excluded.account_display_name,
  account_holder_name = excluded.account_holder_name,
  bank_name = excluded.bank_name,
  account_number = excluded.account_number,
  account_type = excluded.account_type,
  ifsc_code = excluded.ifsc_code,
  branch_name = excluded.branch_name,
  branch_address = excluded.branch_address,
  swift_bic_code = excluded.swift_bic_code,
  payment_instructions = excluded.payment_instructions,
  is_active = 1,
  is_default = 0,
  updated_at = datetime('now');

-- 4. Ensure authentic settings with real PAN, UDYAM, and genuine handwritten signature
INSERT INTO invoice_settings (
  id, legal_name, display_name, registered_address, city, state, postal_code, country,
  official_email, contact_number, pan_number, udyam_registration, gstin,
  authorized_signatory_name, signature_key, signature_image_url, signature_file_name, signature_updated_at,
  default_currency, default_payment_terms, default_invoice_notes,
  default_tax_enabled, default_tax_label, default_tax_rate, updated_at, updated_by
) VALUES (
  'settings_main',
  'Zenemoo',
  'Zenemoo',
  'K. Barida, Main Road',
  'Ganjam',
  'Odisha',
  '761031',
  'India',
  'contact@zenemoo.in',
  '+91 9827775230',
  'IDWPP3025F',
  'UDYAM-OD-11-0124893',
  '',
  'Prem Prasad Pradhan',
  'signatures/sig_1792217794390_f9e14249.png',
  'signatures/sig_1792217794390_f9e14249.png',
  'prem-signature.png',
  '2026-10-17 06:16:34',
  'INR',
  'Net 15 Days',
  'Thank you for partnering with Zenemoo. Payment is expected within the agreed terms.',
  0,
  'GST',
  18.0,
  datetime('now'),
  'system'
)
ON CONFLICT(id) DO UPDATE SET
  legal_name = 'Zenemoo',
  display_name = 'Zenemoo',
  registered_address = 'K. Barida, Main Road',
  city = 'Ganjam',
  state = 'Odisha',
  postal_code = '761031',
  country = 'India',
  official_email = 'contact@zenemoo.in',
  contact_number = '+91 9827775230',
  pan_number = 'IDWPP3025F',
  udyam_registration = 'UDYAM-OD-11-0124893',
  gstin = '',
  authorized_signatory_name = 'Prem Prasad Pradhan',
  signature_key = 'signatures/sig_1792217794390_f9e14249.png',
  signature_image_url = 'signatures/sig_1792217794390_f9e14249.png',
  signature_file_name = 'prem-signature.png',
  signature_updated_at = '2026-10-17 06:16:34',
  updated_at = datetime('now'),
  updated_by = 'system';
