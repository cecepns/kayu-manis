-- Migration: Move currency from products/order_items to orders table
-- Date: 2025-01-27
-- Description: Currency should be at order level, not product level

USE furniture_order_management;

-- Add currency to orders table (main currency for the entire order)
ALTER TABLE orders 
ADD COLUMN currency VARCHAR(10) DEFAULT 'USD' COMMENT 'Currency code for the order (USD, EUR, Rp, etc.)' 
AFTER buyer_address;

-- Remove currency from order_items table (no longer needed as it's in orders)
ALTER TABLE order_items 
DROP COLUMN IF EXISTS currency;

-- Remove currency from products table (only nominal price needed, no currency)
ALTER TABLE products 
DROP COLUMN IF EXISTS currency;

-- Update existing orders to have USD as default currency (if any exist without currency)
UPDATE orders SET currency = 'USD' WHERE currency IS NULL;

-- Add index for currency in orders table for better query performance
CREATE INDEX idx_orders_currency ON orders(currency);
