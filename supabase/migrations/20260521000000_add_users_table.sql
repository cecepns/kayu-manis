-- App users with menu-based permissions (enforced on frontend)

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
    menu_permissions JSON NOT NULL COMMENT 'Array of menu keys: folders, products, buyers, orders, reports, users',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_username (username),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Application users with menu access permissions';

-- Default admin: password @admin123 (bcrypt, cost 10)
INSERT INTO users (username, password, menu_permissions, is_active)
VALUES (
    'admin',
    '$2b$10$NDWOlTPiBvBK/S0eWC7TQOMOEzuR5Z8ue8w5IgBaFg7YP2TGp1ukG',
    '["folders","products","buyers","orders","reports","users"]',
    1
)
ON DUPLICATE KEY UPDATE username = username;
