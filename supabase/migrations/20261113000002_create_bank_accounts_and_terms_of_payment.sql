-- Migration: Create bank_accounts and terms_of_payment tables with default presets
-- Date: 2026-11-13

USE furniture_order_management;

-- Create bank_accounts table for customizable bank accounts
CREATE TABLE IF NOT EXISTS bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bank_key VARCHAR(50) NOT NULL UNIQUE COMMENT 'Unique identifier/code',
  name VARCHAR(100) NOT NULL COMMENT 'Display name, e.g. PERMATA EURO',
  bank_name VARCHAR(100) NULL COMMENT 'Bank institution name',
  account_name VARCHAR(100) NOT NULL COMMENT 'Account owner name',
  account VARCHAR(100) NOT NULL COMMENT 'Account number',
  account_currency VARCHAR(20) NULL COMMENT 'EURO, USD, IDR',
  swift_code VARCHAR(50) NULL COMMENT 'SWIFT / BIC code',
  address VARCHAR(255) NULL COMMENT 'Branch address',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_bank_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customizable bank accounts for order report footers';

-- Seed default bank accounts
INSERT INTO bank_accounts (bank_key, name, bank_name, account_name, account, account_currency, swift_code, address, is_active)
VALUES
  ('permata-euro', 'PERMATA EURO', 'Bank Permata', 'CV KAYU MANIS', '6902700445', 'EURO', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1),
  ('permata-escrow', 'PERMATA ESCROW', 'Bank Permata', 'CV KAYU MANIS', '701466403', 'USD', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1),
  ('permata-usd', 'PERMATA USD', 'Bank Permata', 'CV KAYU MANIS', '701466101', 'USD', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1),
  ('permata-alex', 'PERMATA ALEX K.', 'Bank Permata', 'ALEX KURNIAWAN', '6903701232', '', 'BBBAIDJA', 'JL BRIGJEND KATAMSO, YOGYAKARTA, INDONESIA', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Create terms_of_payment table for customizable payment terms
CREATE TABLE IF NOT EXISTS terms_of_payment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Payment term description',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_top_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Customizable payment terms for orders';

-- Seed default terms of payment
INSERT INTO terms_of_payment (name, is_active)
VALUES
  ('30% Deposit 70% Balance Payments Agains Documents', 1),
  ('L/C Irrevocable', 1),
  ('50:50', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);

