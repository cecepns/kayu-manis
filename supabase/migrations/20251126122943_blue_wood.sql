-- Furniture Order Management Database
-- Created for comprehensive furniture export business management

CREATE DATABASE IF NOT EXISTS furniture_order_management;
USE furniture_order_management;

-- Table: products
-- Stores all furniture product information with detailed specifications
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    km_code VARCHAR(100) NOT NULL UNIQUE COMMENT 'Product code identifier',
    description TEXT NOT NULL COMMENT 'Detailed product description',
    picture_url VARCHAR(500) DEFAULT NULL COMMENT 'Path to product image',
    
    -- Size specifications in centimeters
    size_width DECIMAL(10,2) DEFAULT NULL COMMENT 'Product width in cm',
    size_depth DECIMAL(10,2) DEFAULT NULL COMMENT 'Product depth in cm', 
    size_height DECIMAL(10,2) DEFAULT NULL COMMENT 'Product height in cm',
    
    -- Packing size specifications in centimeters
    packing_width DECIMAL(10,2) DEFAULT NULL COMMENT 'Packing width in cm',
    packing_depth DECIMAL(10,2) DEFAULT NULL COMMENT 'Packing depth in cm',
    packing_height DECIMAL(10,2) DEFAULT NULL COMMENT 'Packing height in cm',
    
    -- Physical properties
    cbm DECIMAL(10,4) DEFAULT NULL COMMENT 'Cubic meter measurement',
    color VARCHAR(100) DEFAULT NULL COMMENT 'Product color',
    
    -- Weight specifications in kilograms
    gross_weight DECIMAL(10,2) DEFAULT NULL COMMENT 'Gross weight per unit in kg',
    net_weight DECIMAL(10,2) DEFAULT NULL COMMENT 'Net weight per unit in kg',
    total_gw DECIMAL(10,2) DEFAULT NULL COMMENT 'Total gross weight in kg',
    
    -- Pricing in USD
    fob_price DECIMAL(12,2) DEFAULT NULL COMMENT 'FOB price per unit in USD',
    total_price DECIMAL(12,2) DEFAULT NULL COMMENT 'Total price in USD',
    
    -- Additional information
    hs_code VARCHAR(50) DEFAULT NULL COMMENT 'Harmonized System code for customs',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for better performance
    INDEX idx_km_code (km_code),
    INDEX idx_description (description(100)),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Furniture products catalog with detailed specifications';

-- Table: orders  
-- Stores order header information including buyer details
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    no_pi VARCHAR(100) NOT NULL UNIQUE COMMENT 'Proforma Invoice number',
    buyer_name VARCHAR(255) NOT NULL COMMENT 'Name of the buyer/customer',
    buyer_address TEXT NOT NULL COMMENT 'Complete buyer address',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_no_pi (no_pi),
    INDEX idx_buyer_name (buyer_name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Order headers with buyer information';

-- Table: order_items
-- Stores individual items within each order with calculated values
CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL COMMENT 'Reference to orders table',
    product_id INT NOT NULL COMMENT 'Reference to products table',
    client_code VARCHAR(100) DEFAULT NULL COMMENT 'Client-specific product code',
    qty INT NOT NULL DEFAULT 1 COMMENT 'Quantity ordered',
    
    -- Calculated values (auto-computed from product data * quantity)
    cbm_total DECIMAL(10,4) DEFAULT NULL COMMENT 'Total CBM (product CBM * qty)',
    fob_total_usd DECIMAL(12,2) DEFAULT NULL COMMENT 'Total FOB USD (product FOB * qty)',
    gross_weight_total DECIMAL(10,2) DEFAULT NULL COMMENT 'Total gross weight (kg)',
    net_weight_total DECIMAL(10,2) DEFAULT NULL COMMENT 'Total net weight (kg)', 
    total_gw_total DECIMAL(10,2) DEFAULT NULL COMMENT 'Total GW (kg)',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    
    -- Indexes
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    INDEX idx_client_code (client_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Individual items within orders with calculated totals';

-- Insert sample furniture products for demonstration
INSERT INTO products (
    km_code, description, picture_url, 
    size_width, size_depth, size_height,
    packing_width, packing_depth, packing_height,
    cbm, color, gross_weight, net_weight, total_gw,
    fob_price, total_price, hs_code
) VALUES 
(
    'SF001', 
    'Modern 3-Seater Sofa with Premium Fabric Upholstery',
    NULL,
    180.00, 85.00, 78.00,
    185.00, 90.00, 83.00,
    1.385, 
    'Gray', 
    45.50, 42.00, 45.50,
    1299.00, 1299.00,
    '9401.10.00'
),
(
    'CT002', 
    'Solid Wood Coffee Table with Storage Drawers',
    NULL,
    120.00, 60.00, 45.00,
    125.00, 65.00, 50.00,
    0.406,
    'Natural Oak',
    28.50, 25.00, 28.50,
    589.00, 589.00,
    '9403.50.90'
),
(
    'DR003',
    'Extendable Dining Table for 6-8 People',
    NULL,
    160.00, 90.00, 75.00,
    165.00, 95.00, 80.00,
    1.254,
    'Walnut',
    52.00, 48.00, 52.00,
    899.00, 899.00,
    '9403.60.90'
),
(
    'CH004',
    'Ergonomic Office Chair with Lumbar Support', 
    NULL,
    65.00, 65.00, 110.00,
    70.00, 70.00, 115.00,
    0.564,
    'Black',
    18.50, 16.00, 18.50,
    345.00, 345.00,
    '9401.30.00'
),
(
    'WD005',
    'Multi-Drawer Bedroom Wardrobe with Mirror',
    NULL,
    200.00, 60.00, 220.00,
    205.00, 65.00, 225.00,
    2.995,
    'White',
    85.00, 78.00, 85.00,
    1599.00, 1599.00,
    '9403.30.90'
),
(
    'BT006',
    'King Size Platform Bed with Headboard Storage',
    NULL,
    210.00, 180.00, 120.00,
    215.00, 185.00, 125.00,
    4.973,
    'Dark Brown',
    95.00, 88.00, 95.00,
    1899.00, 1899.00,
    '9403.50.90'
),
(
    'SC007',
    '2-Door Storage Cabinet with Adjustable Shelves',
    NULL,
    80.00, 40.00, 160.00,
    85.00, 45.00, 165.00,
    0.632,
    'Light Wood',
    32.00, 28.50, 32.00,
    425.00, 425.00,
    '9403.30.90'
),
(
    'DT008',
    'Height-Adjustable Standing Desk',
    NULL,
    140.00, 70.00, 75.00,
    145.00, 75.00, 80.00,
    0.870,
    'White/Silver',
    38.50, 35.00, 38.50,
    675.00, 675.00,
    '9403.10.00'
);

-- Insert sample orders for demonstration
INSERT INTO orders (no_pi, buyer_name, buyer_address) VALUES 
(
    'PI-2025-001',
    'European Furniture Imports Ltd.',
    'Warehouse District, Building 12\n15 Commerce Street\nAmsterdam, Netherlands 1012 AB\nEU VAT: NL123456789B01'
),
(
    'PI-2025-002', 
    'American Home Decor Inc.',
    '2550 Furniture Boulevard\nSuite 200\nCharlotte, NC 28203\nUnited States\nTax ID: 12-3456789'
),
(
    'PI-2025-003',
    'Pacific Furniture Solutions Pty Ltd',
    'Level 3, Trade Center\n88 Furniture Road\nSydney, NSW 2000\nAustralia\nABN: 12 345 678 901'
);

-- Insert sample order items
INSERT INTO order_items (
    order_id, product_id, client_code, qty, cbm_total, fob_total_usd,
    gross_weight_total, net_weight_total, total_gw_total
) VALUES 
-- Order 1 items
(1, 1, 'EFI-SF-GRY', 5, 6.925, 6495.00, 227.50, 210.00, 227.50),
(1, 2, 'EFI-CT-OAK', 3, 1.218, 1767.00, 85.50, 75.00, 85.50),
(1, 4, 'EFI-CH-BLK', 8, 4.512, 2760.00, 148.00, 128.00, 148.00),

-- Order 2 items  
(2, 3, 'AHD-DT-WAL', 4, 5.016, 3596.00, 208.00, 192.00, 208.00),
(2, 5, 'AHD-WD-WHT', 2, 5.990, 3198.00, 170.00, 156.00, 170.00),
(2, 8, 'AHD-DSK-WS', 6, 5.220, 4050.00, 231.00, 210.00, 231.00),

-- Order 3 items
(3, 6, 'PFS-BED-DB', 3, 14.919, 5697.00, 285.00, 264.00, 285.00),
(3, 7, 'PFS-CAB-LW', 4, 2.528, 1700.00, 128.00, 114.00, 128.00),
(3, 1, 'PFS-SF-GRY', 2, 2.770, 2598.00, 91.00, 84.00, 91.00);

-- Views for easier reporting and analysis
-- Order summary view
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
    COALESCE(SUM(oi.total_gw_total), 0) as total_gw
FROM orders o
LEFT JOIN order_items oi ON o.id = oi.order_id
GROUP BY o.id, o.no_pi, o.buyer_name, o.buyer_address, o.created_at;

-- Product popularity view
CREATE VIEW v_product_popularity AS
SELECT 
    p.id,
    p.km_code,
    p.description,
    p.color,
    p.fob_price,
    COALESCE(SUM(oi.qty), 0) as total_ordered,
    COALESCE(COUNT(DISTINCT oi.order_id), 0) as orders_count,
    COALESCE(SUM(oi.fob_total_usd), 0) as total_revenue
FROM products p
LEFT JOIN order_items oi ON p.id = oi.product_id
GROUP BY p.id, p.km_code, p.description, p.color, p.fob_price
ORDER BY total_ordered DESC;

-- Indexes for performance optimization
CREATE INDEX idx_orders_date_range ON orders(created_at);
CREATE INDEX idx_order_items_date_range ON order_items(created_at);
CREATE INDEX idx_products_price_range ON products(fob_price);

-- Show database summary
SELECT 
    'Database Created Successfully' as status,
    'furniture_order_management' as database_name,
    (SELECT COUNT(*) FROM products) as sample_products,
    (SELECT COUNT(*) FROM orders) as sample_orders,
    (SELECT COUNT(*) FROM order_items) as sample_order_items;