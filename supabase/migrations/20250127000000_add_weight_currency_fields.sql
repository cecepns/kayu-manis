-- Migration: Add total_nw, currency, and fob fields
-- Date: 2025-01-27

USE furniture_order_management;

-- Add total_nw to products table
ALTER TABLE products 
ADD COLUMN total_nw DECIMAL(10,2) DEFAULT NULL COMMENT 'Total net weight in kg' 
AFTER total_gw;

-- Add currency to products table (default currency for product)
ALTER TABLE products 
ADD COLUMN currency VARCHAR(10) DEFAULT 'USD' COMMENT 'Currency code (USD, EUR, Rp, etc.)' 
AFTER fob_price;

-- Add total_nw_total to order_items table
ALTER TABLE order_items 
ADD COLUMN total_nw_total DECIMAL(10,2) DEFAULT NULL COMMENT 'Total NW (kg)' 
AFTER total_gw_total;

-- Add currency to order_items table (can override product currency)
ALTER TABLE order_items 
ADD COLUMN currency VARCHAR(10) DEFAULT NULL COMMENT 'Currency code (USD, EUR, Rp, etc.) - overrides product currency' 
AFTER fob_total_usd;

-- Add fob to order_items table (FOB value without currency symbol)
ALTER TABLE order_items 
ADD COLUMN fob DECIMAL(12,2) DEFAULT NULL COMMENT 'FOB price per unit' 
AFTER currency;

-- Update the view to include new fields
DROP VIEW IF EXISTS v_order_summary;

CREATE VIEW v_order_summary AS
SELECT 
    o.id,
    o.no_pi,
    o.buyer_name,
    o.buyer_address,
    o.created_at,
    COUNT(oi.id) as item_count,
    COALESCE(SUM(oi.cbm_total), 0) as total_cbm,
    COALESCE(SUM(oi.fob_total_usd), 0) as total_fob_usd,
    COALESCE(SUM(oi.gross_weight_total), 0) as total_gross_weight,
    COALESCE(SUM(oi.net_weight_total), 0) as total_net_weight,
    COALESCE(SUM(oi.total_gw_total), 0) as total_gw,
    COALESCE(SUM(oi.total_nw_total), 0) as total_nw
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.no_pi, o.buyer_name, o.buyer_address, o.created_at;
