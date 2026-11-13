-- Migration: Add user roles per menu, price visibility access, and folder restriction permissions
-- Date: 2026-11-13

USE furniture_order_management;

ALTER TABLE users
  ADD COLUMN menu_roles JSON NULL COMMENT 'Role per menu: editor or viewer (e.g. {"folders":"viewer","products":"editor"})' AFTER menu_permissions,
  ADD COLUMN can_view_price TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Access to view FOB and total price: 1=yes, 0=no' AFTER menu_roles,
  ADD COLUMN allowed_folder_ids JSON NULL COMMENT 'Array of restricted folder IDs (e.g. [28]), NULL for all folders' AFTER can_view_price;
