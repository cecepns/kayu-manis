-- Migration: Add PO number and report footer fields to orders
-- Date: 2026-05-06

USE furniture_order_management;

ALTER TABLE orders
  ADD COLUMN no_po VARCHAR(255) NULL COMMENT 'Purchase order number' AFTER buyer_address,
  ADD COLUMN terms_of_payment VARCHAR(500) NULL COMMENT 'Terms of payment for report' AFTER destination_port,
  ADD COLUMN delivery_terms VARCHAR(500) NULL COMMENT 'Delivery terms for report' AFTER terms_of_payment,
  ADD COLUMN cargo_ready_by VARCHAR(500) NULL COMMENT 'Cargo ready by text for report' AFTER delivery_terms,
  ADD COLUMN bank_id VARCHAR(50) NULL COMMENT 'Selected bank preset id' AFTER cargo_ready_by;
