-- ==============================================================================
-- ZENEMOO Production Cloudflare D1 Database Schema — Invoicing Architecture
-- Migration: 0002_add_payment_link_to_invoices.sql
-- Adds optional Cashfree Payment Link and QR Code support to invoices
-- ==============================================================================

ALTER TABLE invoices ADD COLUMN payment_link_id TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN payment_link_url TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN payment_link_status TEXT DEFAULT 'NOT_CREATED';
ALTER TABLE invoices ADD COLUMN payment_link_amount REAL DEFAULT 0.0;
ALTER TABLE invoices ADD COLUMN payment_link_expiry TEXT DEFAULT NULL;
ALTER TABLE invoices ADD COLUMN include_payment_link INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN include_payment_qr INTEGER DEFAULT 0;
