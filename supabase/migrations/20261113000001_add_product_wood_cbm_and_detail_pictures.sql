-- Migration: Add wood_cbm, detail_pictures, and currency to products table
-- Date: 2026-11-13

USE furniture_order_management;

-- Ensure currency column exists in products (default 'USD')
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD' COMMENT 'Product currency (USD, EUR, IDR)' AFTER fob_price;

-- Add finished volume CBM kayu (wood_cbm)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS wood_cbm DECIMAL(10,4) NULL COMMENT 'Finished volume CBM kayu' AFTER cbm;

-- Add detail_pictures JSON array for multi-photo details
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS detail_pictures JSON NULL COMMENT 'Array of detail image URLs' AFTER picture_url;

