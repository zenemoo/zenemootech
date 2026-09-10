-- Database Migration: Support Zenemoo Payments (support_payments)
-- Table for tracking contributions and Cashfree payment transactions

CREATE TABLE IF NOT EXISTS support_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(100) UNIQUE NOT NULL,
  user_id TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  provider VARCHAR(50) DEFAULT 'cashfree',
  status VARCHAR(30) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'USER_DROPPED')),
  payment_id TEXT,
  cf_order_id TEXT,
  payment_session_id TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  payment_method TEXT,
  payment_time TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_payments_order_id ON support_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_support_payments_status ON support_payments(status);
CREATE INDEX IF NOT EXISTS idx_support_payments_email ON support_payments(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_payments_user_id ON support_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_support_payments_created_at ON support_payments(created_at DESC);
