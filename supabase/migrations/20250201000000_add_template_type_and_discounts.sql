-- Add template_type to orders table
ALTER TABLE orders 
ADD COLUMN template_type ENUM('normal', 'special') DEFAULT 'normal' NOT NULL 
COMMENT 'Template type for Excel export: normal or special';

-- Add discount fields to order_items table
ALTER TABLE order_items 
ADD COLUMN discount_5 DECIMAL(12,2) DEFAULT NULL 
COMMENT 'Discount 5% amount (calculated from FOB price)',
ADD COLUMN discount_10 DECIMAL(12,2) DEFAULT NULL 
COMMENT 'Discount 10% amount (calculated from FOB price)';

-- Add index for template_type for faster queries
CREATE INDEX idx_template_type ON orders(template_type);
