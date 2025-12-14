-- Add buyers table and update orders table to use buyer_id

-- Create buyers table
CREATE TABLE IF NOT EXISTS buyers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'Buyer name',
    address TEXT NOT NULL COMMENT 'Buyer address',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_name (name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Buyer information for orders';

-- Add buyer_id column to orders table
ALTER TABLE orders 
ADD COLUMN buyer_id INT DEFAULT NULL COMMENT 'Reference to buyers table' AFTER id,
ADD INDEX idx_buyer_id (buyer_id);

-- Add foreign key constraint
ALTER TABLE orders 
ADD CONSTRAINT fk_orders_buyer 
FOREIGN KEY (buyer_id) REFERENCES buyers(id) ON DELETE RESTRICT;

-- Migrate existing data: Create buyers from existing buyer_name and buyer_address
INSERT INTO buyers (name, address)
SELECT DISTINCT buyer_name, buyer_address
FROM orders
WHERE buyer_name IS NOT NULL AND buyer_address IS NOT NULL;

-- Update orders to reference buyers
UPDATE orders o
INNER JOIN buyers b ON o.buyer_name = b.name AND o.buyer_address = b.address
SET o.buyer_id = b.id;

-- Make buyer_id NOT NULL after migration
ALTER TABLE orders 
MODIFY COLUMN buyer_id INT NOT NULL;

-- Drop old columns (optional - comment out if you want to keep them for backup)
-- ALTER TABLE orders DROP COLUMN buyer_name;
-- ALTER TABLE orders DROP COLUMN buyer_address;



