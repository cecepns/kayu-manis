-- Add product folders feature
-- This migration creates the product_folders table and adds folder_id to products

USE furniture_order_management;

-- Create product_folders table
CREATE TABLE IF NOT EXISTS product_folders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL COMMENT 'Folder name',
    description TEXT DEFAULT NULL COMMENT 'Folder description',
    color VARCHAR(50) DEFAULT NULL COMMENT 'Folder color for UI display',
    
    -- Audit fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_name (name),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Product folders for organizing products into categories';

-- Add folder_id column to products table
ALTER TABLE products 
ADD COLUMN folder_id INT DEFAULT NULL COMMENT 'Reference to product_folders table' AFTER id,
ADD INDEX idx_folder_id (folder_id),
ADD CONSTRAINT fk_products_folder 
    FOREIGN KEY (folder_id) REFERENCES product_folders(id) 
    ON DELETE SET NULL;

-- Insert default folder
INSERT INTO product_folders (name, description, color) VALUES 
('Uncategorized', 'Products without a specific folder', '#9CA3AF');

