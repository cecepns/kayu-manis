-- Migration: Change volume column from DECIMAL to VARCHAR
-- Date: 2025-12-01
-- Description: Volume field should store container volume descriptions (e.g., "1 x 20"") as strings, not numeric CBM values

USE furniture_order_management;

-- Change volume column from DECIMAL(10,2) to VARCHAR(255) to store container volume descriptions
ALTER TABLE orders
  MODIFY COLUMN volume VARCHAR(255) NULL COMMENT 'Container volume description (e.g., "1 x 20"", "1 x 40"")';

