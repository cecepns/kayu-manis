-- Migration: Add custom columns support to orders and order_items
-- Date: 2025-01-28
-- Description: Allow users to add up to 5 custom columns per order with values stored per item

USE furniture_order_management;

-- Add custom_columns field to orders table (stores array of custom column names as JSON)
ALTER TABLE orders
  ADD COLUMN custom_columns TEXT NULL COMMENT 'JSON array of custom column names (max 5 columns)' AFTER destination_port;

-- Add custom_column_values field to order_items table (stores key-value pairs as JSON)
ALTER TABLE order_items
  ADD COLUMN custom_column_values TEXT NULL COMMENT 'JSON object storing custom column values for this item' AFTER fob;

-- Add index for better query performance (optional, but helpful for filtering)
-- Note: JSON fields can't be indexed directly in MySQL, but we can add a generated column if needed
-- For now, we'll skip indexing as it's not critical for this use case

