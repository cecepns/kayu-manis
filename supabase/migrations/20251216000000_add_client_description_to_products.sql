-- Migration: Add client_description field to products table
-- Date: 2025-12-16
-- Description: Add client_description field to store client-specific description for special template orders

USE furniture_order_management;

-- Add client_description column to products table
ALTER TABLE products
  ADD COLUMN client_description TEXT NULL COMMENT 'Client-specific description for special template orders' AFTER client_barcode;


