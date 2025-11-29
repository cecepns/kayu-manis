-- Migration: Add invoice date, volume, and port fields to orders table
-- Date: 2025-11-26
-- Description: Store manual invoice date and shipment information at order level

USE furniture_order_management;

-- Add new columns to orders table
ALTER TABLE orders
  ADD COLUMN invoice_date DATE NULL COMMENT 'Manual invoice date' AFTER currency,
  ADD COLUMN volume DECIMAL(10,2) NULL COMMENT 'Shipment volume in CBM' AFTER invoice_date,
  ADD COLUMN port_loading VARCHAR(255) NULL COMMENT 'Port of loading' AFTER volume,
  ADD COLUMN destination_port VARCHAR(255) NULL COMMENT 'Destination port' AFTER port_loading;

-- Optional: initialize volume from existing summary data is not done here,
-- as it depends on business rules. Keep NULL by default.





