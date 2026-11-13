-- Migration: Add Iemanja special template columns to order_items
-- Date: 2026-11-13

USE furniture_order_management;

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS door_count INT NULL COMMENT 'Jumlah Pintu (Template Iemanja)' AFTER discount_10,
  ADD COLUMN IF NOT EXISTS drawer_count INT NULL COMMENT 'Jumlah Laci (Template Iemanja)' AFTER door_count,
  ADD COLUMN IF NOT EXISTS hinge_price DECIMAL(12,2) NULL COMMENT 'Harga Engsel (Template Iemanja)' AFTER drawer_count,
  ADD COLUMN IF NOT EXISTS blum_runner_price DECIMAL(12,2) NULL COMMENT 'Harga Rel Merk BLUM (Template Iemanja)' AFTER hinge_price;

