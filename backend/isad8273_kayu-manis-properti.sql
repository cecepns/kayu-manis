-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Waktu pembuatan: 16 Des 2025 pada 11.21
-- Versi server: 10.11.14-MariaDB-cll-lve
-- Versi PHP: 8.4.15

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `isad8273_kayu-manis-properti`
--

-- --------------------------------------------------------

--
-- Struktur dari tabel `buyers`
--

CREATE TABLE `buyers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Buyer name',
  `address` text NOT NULL COMMENT 'Buyer address',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Buyer information for orders';

--
-- Dumping data untuk tabel `buyers`
--

INSERT INTO `buyers` (`id`, `name`, `address`, `created_at`, `updated_at`) VALUES
(1, 'SKLUM', 'B98845936\nC/ Partida Tancaes S/N\n46720 Vilallonga, Valencia\nSPAIN', '2025-12-14 08:01:37', '2025-12-14 08:01:37'),
(3, 'IPERCERAMICA', 'ITALY', '2025-12-15 01:48:21', '2025-12-15 01:48:21');

-- --------------------------------------------------------

--
-- Struktur dari tabel `orders`
--

CREATE TABLE `orders` (
  `id` int(11) NOT NULL,
  `buyer_id` int(11) NOT NULL,
  `no_pi` varchar(100) NOT NULL COMMENT 'Proforma Invoice number',
  `buyer_name` varchar(255) NOT NULL COMMENT 'Name of the buyer/customer',
  `buyer_address` text NOT NULL COMMENT 'Complete buyer address',
  `currency` varchar(10) DEFAULT 'USD' COMMENT 'Currency code for the order (USD, EUR, Rp, etc.)',
  `invoice_date` date DEFAULT NULL COMMENT 'Manual invoice date',
  `volume` varchar(255) DEFAULT NULL COMMENT 'Container volume description (e.g., "1 x 20"", "1 x 40"")',
  `port_loading` varchar(255) DEFAULT NULL COMMENT 'Port of loading',
  `destination_port` varchar(255) DEFAULT NULL COMMENT 'Destination port',
  `custom_columns` text DEFAULT NULL COMMENT 'JSON array of custom column names (max 5 columns)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `template_type` enum('normal','special') NOT NULL DEFAULT 'normal' COMMENT 'Template type for Excel export: normal or special'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Order headers with buyer information';

--
-- Dumping data untuk tabel `orders`
--

INSERT INTO `orders` (`id`, `buyer_id`, `no_pi`, `buyer_name`, `buyer_address`, `currency`, `invoice_date`, `volume`, `port_loading`, `destination_port`, `custom_columns`, `created_at`, `updated_at`, `template_type`) VALUES
(19, 1, '072/2025', 'SKLUM', 'B98845936\nC/ Partida Tancaes S/N\n46720 Vilallonga, Valencia\nSPAIN', 'USD', '2025-12-08', '1 x 40\" H', 'SEMARANG', 'VALENCIA', NULL, '2025-12-08 02:16:09', '2025-12-14 08:01:37', 'normal');

-- --------------------------------------------------------

--
-- Struktur dari tabel `order_items`
--

CREATE TABLE `order_items` (
  `id` int(11) NOT NULL,
  `order_id` int(11) NOT NULL COMMENT 'Reference to orders table',
  `product_id` int(11) NOT NULL COMMENT 'Reference to products table',
  `client_code` varchar(100) DEFAULT NULL COMMENT 'Client-specific product code',
  `qty` int(11) NOT NULL DEFAULT 1 COMMENT 'Quantity ordered',
  `cbm_total` decimal(10,4) DEFAULT NULL COMMENT 'Total CBM (product CBM * qty)',
  `fob_total_usd` decimal(12,2) DEFAULT NULL COMMENT 'Total FOB USD (product FOB * qty)',
  `fob` decimal(12,2) DEFAULT NULL COMMENT 'FOB price per unit',
  `custom_column_values` text DEFAULT NULL COMMENT 'JSON object storing custom column values for this item',
  `gross_weight_total` decimal(10,2) DEFAULT NULL COMMENT 'Total gross weight (kg)',
  `net_weight_total` decimal(10,2) DEFAULT NULL COMMENT 'Total net weight (kg)',
  `total_gw_total` decimal(10,2) DEFAULT NULL COMMENT 'Total GW (kg)',
  `total_nw_total` decimal(10,2) DEFAULT NULL COMMENT 'Total NW (kg)',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `unit_price` decimal(12,2) DEFAULT NULL COMMENT 'Unit price for this order item (editable, defaults from product FOB price)',
  `discount_5` decimal(12,2) DEFAULT NULL COMMENT 'Discount 5% amount (calculated from FOB price)',
  `discount_10` decimal(12,2) DEFAULT NULL COMMENT 'Discount 10% amount (calculated from FOB price)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Individual items within orders with calculated totals';

--
-- Dumping data untuk tabel `order_items`
--

INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `client_code`, `qty`, `cbm_total`, `fob_total_usd`, `fob`, `custom_column_values`, `gross_weight_total`, `net_weight_total`, `total_gw_total`, `total_nw_total`, `created_at`, `updated_at`, `unit_price`, `discount_5`, `discount_10`) VALUES
(46, 19, 32, '438142', 300, 21.0681, 11178.00, 37.26, NULL, 4200.00, 3900.00, 4200.00, 3900.00, '2025-12-08 02:16:09', '2025-12-08 02:16:09', NULL, NULL, NULL),
(47, 19, 29, '285340', 500, 27.5000, 14875.00, 29.75, NULL, 5250.00, 4250.00, 5250.00, 4250.00, '2025-12-08 02:16:09', '2025-12-08 02:16:09', NULL, NULL, NULL),
(48, 19, 31, '438135', 200, 14.5656, 7452.00, 37.26, NULL, 2800.00, 2600.00, 2800.00, 2600.00, '2025-12-08 02:16:09', '2025-12-08 02:16:09', NULL, NULL, NULL),
(49, 19, 28, '285333', 100, 5.5000, 2975.00, 29.75, NULL, 1050.00, 850.00, 1050.00, 850.00, '2025-12-08 02:16:09', '2025-12-08 02:16:09', NULL, NULL, NULL),
(50, 19, 18, '285341', 100, 7.6140, 9550.00, 95.50, NULL, 1650.00, 1450.00, 1650.00, 1450.00, '2025-12-08 02:16:09', '2025-12-08 02:16:09', NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Struktur dari tabel `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `km_code` varchar(100) NOT NULL COMMENT 'Product code identifier',
  `description` text DEFAULT NULL COMMENT 'Detailed product description',
  `picture_url` varchar(500) DEFAULT NULL COMMENT 'Path to product image',
  `size_width` decimal(10,2) DEFAULT NULL COMMENT 'Product width in cm',
  `size_depth` decimal(10,2) DEFAULT NULL COMMENT 'Product depth in cm',
  `size_height` decimal(10,2) DEFAULT NULL COMMENT 'Product height in cm',
  `packing_width` decimal(10,2) DEFAULT NULL COMMENT 'Packing width in cm',
  `packing_depth` decimal(10,2) DEFAULT NULL COMMENT 'Packing depth in cm',
  `packing_height` decimal(10,2) DEFAULT NULL COMMENT 'Packing height in cm',
  `cbm` decimal(10,4) DEFAULT NULL COMMENT 'Cubic meter measurement',
  `color` varchar(100) DEFAULT NULL COMMENT 'Product color',
  `gross_weight` decimal(10,2) DEFAULT NULL COMMENT 'Gross weight per unit in kg',
  `net_weight` decimal(10,2) DEFAULT NULL COMMENT 'Net weight per unit in kg',
  `total_gw` decimal(10,2) DEFAULT NULL COMMENT 'Total gross weight in kg',
  `total_nw` decimal(10,2) DEFAULT NULL COMMENT 'Total net weight in kg',
  `fob_price` decimal(12,2) DEFAULT NULL COMMENT 'FOB price per unit in USD',
  `total_price` decimal(12,2) DEFAULT NULL COMMENT 'Total price in USD',
  `hs_code` varchar(50) DEFAULT NULL COMMENT 'Harmonized System code for customs',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `client_code` varchar(255) DEFAULT NULL,
  `client_barcode` varchar(255) DEFAULT NULL COMMENT 'Client barcode identifier',
  `client_description` text DEFAULT NULL COMMENT 'Client-specific description for special template orders',
  `folder_id` int(11) DEFAULT NULL COMMENT 'Reference to product_folders table. NULL means Uncategorized'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Furniture products catalog with detailed specifications';

--
-- Dumping data untuk tabel `products`
--

INSERT INTO `products` (`id`, `km_code`, `description`, `picture_url`, `size_width`, `size_depth`, `size_height`, `packing_width`, `packing_depth`, `packing_height`, `cbm`, `color`, `gross_weight`, `net_weight`, `total_gw`, `total_nw`, `fob_price`, `total_price`, `hs_code`, `created_at`, `updated_at`, `client_code`, `client_barcode`, `client_description`, `folder_id`) VALUES
(15, 'CA-830 SHD Natural', 'Column PAMANA // SPECIAL REQUIREMENT: DOOR AS MAJENE', '/uploads-furniture/furniture-1764555577751-865593351.png', 40.00, 40.00, 180.00, 49.00, 47.00, 189.00, 0.4353, 'Natural Smooth', 28.10, 22.60, 28.10, 22.60, 232.92, 232.92, '9403.60.90', '2025-12-01 02:19:37', '2025-12-15 01:43:44', '285312', NULL, NULL, 3),
(16, 'CA-1006 SHD Natural', 'COLUMN ILLAGA 1 door', '/uploads-furniture/furniture-1764555853147-879573969.png', 60.00, 50.00, 40.00, 69.00, 59.00, 49.00, 0.1995, 'Natural Smooth', 20.00, 17.00, 20.00, 17.00, 119.73, 119.73, '9403.60.90', '2025-12-01 02:24:13', '2025-12-15 01:43:35', '285323', NULL, NULL, 3),
(17, 'CA-1008 SHD Natural', 'CABINET MAJENE', '/uploads-furniture/furniture-1764556030109-851285115.png', 60.00, 50.00, 40.00, 69.00, 59.00, 49.00, 0.1995, 'Natural Smooth', 19.00, 16.00, 19.00, 16.00, 119.73, 119.73, '9403.60.90', '2025-12-01 02:27:10', '2025-12-15 01:43:21', '285330', NULL, NULL, 3),
(18, 'CA-450 SHD Natural', 'Set Cabinet JAVA with Straight Door 40x20x55 H cm with WHITE TERRAZO Washbasin', '/uploads-furniture/furniture-1764560414777-913434600.png', 40.00, 20.00, 55.00, 47.00, 27.00, 60.00, 0.0761, 'Natural Smooth', 16.50, 14.50, 16.50, 14.50, 95.50, 95.50, '9403.60.90', '2025-12-01 02:29:32', '2025-12-15 01:43:10', '285341', NULL, NULL, 3),
(19, 'CA-570 SHD Natural', 'Wall mounted Cabinet NOYAN', '/uploads-furniture/furniture-1764560449151-752662301.png', 60.00, 40.00, 50.00, 67.00, 47.00, 57.00, 0.1795, 'Natural Smooth', 16.60, 14.60, 16.60, 14.60, 120.72, 120.72, '9403.60.90', '2025-12-01 02:31:22', '2025-12-15 01:43:00', '495299', NULL, NULL, 3),
(20, 'CA-571 SHD Natural', ' Wall Cabinet ULUWATU', '/uploads-furniture/furniture-1764560482121-319336590.png', 45.00, 45.00, 45.00, 52.00, 52.00, 52.00, 0.1406, 'Natural Smooth', 13.00, 11.00, 13.00, 11.00, 103.58, 103.58, '9403.60.90', '2025-12-01 02:33:05', '2025-12-15 01:42:41', '495311', NULL, NULL, 3),
(21, 'SH-405 SHD SPE 100 Natural', 'Shelf Uluwatu SPE 100', '/uploads-furniture/furniture-1764560521659-523055921.png', 100.00, 45.00, 6.00, 107.00, 52.00, 13.00, 0.0723, 'Natural Smooth', 8.60, 6.80, 8.60, 6.80, 92.14, 92.14, '9403.60.90', '2025-12-01 02:36:12', '2025-12-15 01:42:33', '495306', NULL, NULL, 3),
(22, 'SH-405 SHD SPE 130 Natural', 'Shelf Uluwatu SPE 130', '/uploads-furniture/furniture-1764560622744-289565066.png', 130.00, 45.00, 6.00, 137.00, 52.00, 13.00, 0.0926, 'Natural Smooth', 13.60, 11.70, 13.60, 11.70, 116.78, 116.78, '9403.60.90', '2025-12-01 02:37:28', '2025-12-15 01:42:22', '568604', NULL, NULL, 3),
(23, 'CA-564 SHD Natural', 'Cabinet LOLITA Single', '/uploads-furniture/furniture-1764560676607-801037700.png', 50.00, 50.00, 80.00, 57.00, 57.00, 87.00, 0.2827, 'Natural Smooth', 16.50, 13.00, 16.50, 13.00, 145.00, 145.00, '9403.60.90', '2025-12-01 02:39:28', '2025-12-15 01:42:14', '495288', NULL, NULL, 3),
(24, 'DI-591 SHD Natural', 'Mirror SKLUM 01', '/uploads-furniture/furniture-1764560754888-837737837.png', 50.00, 12.00, 70.00, 58.00, 8.00, 88.00, 0.0408, 'Natural Smooth', 6.00, 5.00, 6.00, 5.00, 36.77, 36.77, '7009.92.00', '2025-12-01 02:42:33', '2025-12-15 01:42:04', '304900', NULL, NULL, 3),
(25, 'DI-585 SPE SHD Natural', 'Wall Mirror Cabinet NOYAN (Nail Handle on the middle side)', '/uploads-furniture/furniture-1764560845561-108865338.png', 47.00, 12.00, 60.00, 54.00, 20.00, 67.00, 0.0724, 'Natural Smooth', 9.70, 7.70, 9.70, 7.70, 63.34, 63.34, '9403.60.90', '2025-12-01 02:44:40', '2025-12-15 01:41:53', '495305', NULL, NULL, 3),
(26, 'DI-588 SHD Natural', 'Wall Mirror LOLITA Double ', '/uploads-furniture/furniture-1764560867380-891065207.png', 120.00, 12.00, 70.00, 127.00, 10.00, 77.00, 0.0978, 'Natural Smooth', 14.70, 12.20, 14.70, 12.20, 96.44, 96.44, '7009.92.00', '2025-12-01 02:46:28', '2025-12-15 01:41:44', '495312', NULL, NULL, 3),
(27, 'DI-589 SPE SHD Natural', 'Wall Mirror LOLITA Single (tray with rouded edges)', '/uploads-furniture/furniture-1764560912677-129902943.png', 56.00, 12.00, 87.00, 63.00, 10.00, 95.00, 0.0599, 'Natural Smooth', 8.60, 6.60, 8.60, 6.60, 65.36, 65.36, '7009.92.00', '2025-12-01 02:48:08', '2025-12-15 01:41:34', '495318', NULL, NULL, 3),
(28, 'T-01 Grey SHD', 'Terrazzo Washbasin BOWL Grey', '/uploads-furniture/furniture-1764562090774-928046886.png', 40.00, 40.00, 11.00, 50.00, 50.00, 22.00, 0.0550, 'Grey', 10.50, 8.50, 10.50, 8.50, 29.75, 29.75, '6910.90.00', '2025-12-01 02:53:36', '2025-12-15 01:41:26', '285333', NULL, NULL, 3),
(29, 'T-01 White SHD', 'Terrazzo Washbasin BOWL White', '/uploads-furniture/furniture-1764562120744-541471147.png', 40.00, 40.00, 11.00, 50.00, 50.00, 22.00, 0.0550, 'White', 10.50, 8.50, 10.50, 8.50, 29.75, 29.75, '6910.90.00', '2025-12-01 02:55:10', '2025-12-15 01:41:18', '285340', NULL, NULL, 3),
(30, 'T-42 Nat SHD', 'Terrazzo Washbasin Natural', '/uploads-furniture/furniture-1764562163290-276187849.png', 40.00, 40.00, 15.00, 51.00, 51.00, 28.00, 0.0728, 'Natural', 14.00, 13.00, 14.00, 13.00, 37.26, 37.26, '6910.90.00', '2025-12-01 02:57:06', '2025-12-15 01:41:08', NULL, NULL, NULL, 3),
(31, 'T-42 WT SHD', 'Terrazzo Washbasin TERASTONE White', '/uploads-furniture/furniture-1764562220606-217855229.png', 40.00, 40.00, 15.00, 51.00, 51.00, 28.00, 0.0728, 'White', 14.00, 13.00, 14.00, 13.00, 37.26, 37.26, '6910.90.00', '2025-12-01 02:59:33', '2025-12-15 01:40:54', '438135', NULL, NULL, 3),
(32, 'T-42 NW SHD', 'Terrazzo Washbasin TERASTONE Beige', '/uploads-furniture/furniture-1764560805181-271540125.png', 40.00, 40.00, 15.00, 51.00, 51.00, 27.00, 0.0702, 'Natural White (Beige)', 14.00, 13.00, 14.00, 13.00, 37.26, 37.26, '6910.90.00', '2025-12-01 03:01:05', '2025-12-15 01:40:42', '438142', NULL, NULL, 3),
(33, 'T-23 WT SHD', 'Terrazzo Washbasin TRAP ELIPSE White', '/uploads-furniture/furniture-1764562189980-691540994.png', 60.00, 40.00, 10.00, 67.00, 48.00, 25.00, 0.0804, 'White', 15.50, 14.39, 15.50, 14.39, 37.12, 37.12, '6910.90.00', '2025-12-01 03:02:47', '2025-12-15 01:40:34', '495125', NULL, NULL, 3),
(34, 'T-23 Grey SHD', 'Terrazzo Washbasin TRAP ELIPSE Grey', '/uploads-furniture/furniture-1764562253678-445115085.png', 60.00, 40.00, 10.00, 67.00, 48.00, 25.00, 0.0804, 'Grey', 15.50, 14.40, 15.50, 14.40, 37.12, 37.12, '6910.90.00', '2025-12-01 03:04:03', '2025-12-15 01:39:18', '495131', NULL, NULL, 3),
(35, 'T-30 WT SHD', 'Terrazzo Washbasin AESESA White', '/uploads-furniture/furniture-1764562277457-818305444.png', 60.00, 30.00, 10.00, 67.00, 37.00, 20.00, 0.0496, 'White', 17.20, 15.70, 17.20, 15.70, 33.23, 33.23, '6910.90.00', '2025-12-01 03:05:41', '2025-12-15 01:38:12', '495161', NULL, NULL, 3),
(36, 'T-31 WT SHD', 'Terrazzo Washbasin HOPE White', '/uploads-furniture/furniture-1764562299746-118870347.png', 60.00, 30.00, 10.00, 67.00, 37.00, 20.00, 0.0496, 'White', 20.00, 18.60, 20.00, 18.60, 33.23, 33.23, '6910.90.00', '2025-12-01 03:07:16', '2025-12-15 01:37:59', '495174', NULL, NULL, 3),
(37, 'T-31 Grey SHD', 'Terrazzo Washbasin HOPE Grey', '/uploads-furniture/furniture-1764562328464-66269025.png', 60.00, 30.00, 10.00, 67.00, 37.00, 20.00, 0.0496, 'Grey', 20.00, 18.60, 20.00, 18.60, 33.23, 33.23, '6910.90.00', '2025-12-01 03:08:59', '2025-12-15 01:37:49', '495174', NULL, NULL, 3),
(38, 'T-32 WT SHD', 'Terrazzo Washbasin MENTIS White', '/uploads-furniture/furniture-1764562349106-328242583.png', 50.00, 40.00, 10.00, 57.00, 47.00, 20.00, 0.0536, 'White', 27.00, 25.60, 27.00, 25.60, 33.23, 33.23, '6910.90.00', '2025-12-01 03:10:19', '2025-12-15 01:37:36', '495185', NULL, NULL, 3),
(39, 'T-03 WT 40x40 SHD', 'Terrazzo Washbasin SQUARE White 40x40', '/uploads-furniture/furniture-1764562374446-881163422.png', 40.00, 40.00, 10.00, 47.00, 47.00, 20.00, 0.0442, 'White', 19.60, 18.20, 19.60, 18.20, 35.80, 35.80, '6910.90.00', '2025-12-01 03:12:25', '2025-12-15 01:37:27', '495162', NULL, NULL, 3),
(40, 'T-03 Grey 40x40 SHD', 'Terrazzo Washbasin SQUARE Grey 40x40', '/uploads-furniture/furniture-1764562420438-491443014.png', 40.00, 40.00, 10.00, 47.00, 47.00, 20.00, 0.0442, 'Grey', 19.60, 18.20, 19.60, 18.20, 35.80, 35.80, '6910.90.00', '2025-12-01 03:15:09', '2025-12-15 01:37:13', '495167', NULL, NULL, 3),
(41, 'T-04 WT SHD', 'Terrazzo Washbasin CONE White', '/uploads-furniture/furniture-1764562460387-911527569.png', 40.00, 40.00, 12.00, 47.00, 47.00, 20.00, 0.0442, 'White', 7.00, 6.00, 7.00, 6.00, 35.34, 35.34, '6910.90.00', '2025-12-01 03:16:23', '2025-12-15 01:42:51', '495191', NULL, NULL, 3),
(42, 'DI-589 SPE IPC', 'KOMODO SPECCHIO GOCCIA C/MENSOLA TEAK', '/uploads-furniture/furniture-1764737798722-822843604.png', 56.00, 12.00, 87.00, 63.00, 10.00, 94.00, 0.0592, 'Natural Light', 8.00, 6.65, 8.00, 6.65, 0.00, 0.00, '7009.92.00', '2025-12-03 04:43:01', '2025-12-15 01:44:50', '76507', NULL, NULL, 4),
(43, 'DI-587 SPE IPC', 'KOMODO SPECCHIO Ø80 C/MENSOLA TEAK', '/uploads-furniture/furniture-1764737892656-436269034.png', 80.00, 13.00, 80.00, 88.00, 10.00, 86.00, 0.0757, 'Natural Light', 8.50, 7.00, 8.50, 7.00, 0.00, 0.00, '7009.92.00', '2025-12-03 04:43:59', '2025-12-15 01:44:44', '76510', NULL, NULL, 4),
(44, 'CA-564 SPE IPC', 'KOMODO BASE 1A 50x50xH80 NATURAL TEAK', '/uploads-furniture/furniture-1764737998292-7415769.png', 50.00, 50.00, 80.00, 57.00, 57.00, 87.00, 0.2827, 'Natural Light', 17.50, 15.50, 17.50, 15.50, 0.00, 0.00, '9403.60.90', '2025-12-03 04:48:32', '2025-12-15 01:44:38', '76511', NULL, NULL, 4),
(45, 'CA-562-100 IPC', 'KOMODO OVAL BASE 2A 100x52Xh80 NAT TEAK', '/uploads-furniture/furniture-1764738120289-956191682.png', 102.00, 52.00, 80.00, 107.00, 59.00, 87.00, 0.5492, 'Natural Light', 39.10, 34.30, 39.10, 34.30, 0.00, 0.00, '9403.60.90', '2025-12-03 04:49:21', '2025-12-15 01:44:32', '79370', NULL, NULL, 4),
(46, 'DI-858 IPC', 'KOMODO SCALETTA h160 NATURAL TEAK', '/uploads-furniture/furniture-1764738235958-114912836.png', 50.00, 7.00, 160.00, 57.00, 13.00, 167.00, 0.1237, 'Natural Light', 8.00, 7.00, 8.00, 7.00, 0.00, 0.00, '9403.60.90', '2025-12-03 04:50:14', '2025-12-15 01:44:26', '80169', NULL, NULL, 4),
(47, 'CA 562.120 IPC', 'KOMODO OVAL BASE 2A 122x52Xh80 NATURAL TEAK', '/uploads-furniture/furniture-1765764033903-561384306.png', 122.00, 52.00, 80.00, 129.00, 60.00, 88.00, 0.6811, 'Natural Light', 46.00, 44.00, 46.00, 44.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:00:33', '2025-12-15 03:18:06', '76508', '8050759639619', NULL, 4),
(48, 'CA 562.140 IPC', 'KOMODO OVAL BASE 2A 140x52Xh80 NAT TEAK', NULL, 142.00, 52.00, 80.00, 150.00, 60.00, 88.00, 0.7920, 'Natural Light', 48.50, 46.50, 48.50, 46.50, 0.00, 0.00, '9403.60.90', '2025-12-15 02:04:59', '2025-12-15 03:18:36', '79371', '8050759657323', NULL, 4),
(49, 'DI 588 IPC', 'KOMODO SPECCHIO 120x70 C/MENSOLA NATURAL TEAK', NULL, 120.00, 12.00, 70.00, 127.00, 10.00, 78.00, 0.0991, 'Natural Light', 15.00, 14.00, 15.00, 14.00, 0.00, 0.00, '7009.92.00', '2025-12-15 02:07:47', '2025-12-15 03:19:38', '76509', '8050759639596', NULL, 4),
(50, 'CA 569 IPC', 'KOMODO BASE 1A 67x50xH80 NATURAL TEAK', NULL, 67.00, 50.00, 80.00, 74.00, 59.00, 89.00, 0.3886, 'Natural Light', 26.00, 24.00, 26.00, 24.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:11:24', '2025-12-15 03:19:53', '76512', '8050759639534', NULL, 4),
(51, 'CA 569 SPE 50 IPC', 'KOMODO BASE 1A Ø50xH80 NATURAL TEAK', NULL, 50.00, 50.00, 80.00, 57.00, 58.00, 88.00, 0.2909, 'Natural Light', 18.50, 16.50, 18.50, 16.50, 0.00, 0.00, '9403.60.90', '2025-12-15 02:13:14', '2025-12-15 03:20:11', '79432', '8050759657279', NULL, 4),
(52, 'DI 584 IPC', 'KOMODO SPECCHIO Ã˜79 C/ 2 MENSOLE NATURAL TEAK', NULL, 79.00, 12.00, 62.00, 87.00, 10.00, 79.00, 0.0687, 'Natural Light', 7.00, 6.00, 7.00, 6.00, 0.00, 0.00, '7009.92.00', '2025-12-15 02:22:02', '2025-12-15 03:20:31', '76513', '8050759639510', NULL, 4),
(53, 'CA 1008.50 IPC', 'LOMBOK BASE 1A 50x50xH40 NATURAL TEAK', NULL, 50.00, 50.00, 40.00, 57.00, 57.00, 47.00, 0.1527, 'Natural Light', 16.00, 14.00, 16.00, 14.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:38:59', '2025-12-15 03:21:00', '76713', '8050759640998', NULL, 4),
(54, 'CA 1008.60 IPC', 'LOMBOK BASE 1A 60x50xH40 NATURAL TEAK', NULL, 60.00, 50.00, 40.00, 68.00, 58.00, 48.00, 0.1893, 'Natural Light', 20.00, 18.00, 20.00, 18.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:42:48', '2025-12-15 03:21:22', '76514', '8050759639497', NULL, 4),
(55, 'CA 1008.80 IPC', 'LOMBOK BASE 2A 80x50xH40 NATURAL TEAK', NULL, 80.00, 50.00, 40.00, 88.00, 58.00, 47.00, 0.2399, 'Natural Light', 22.00, 20.00, 22.00, 20.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:53:10', '2025-12-15 03:21:38', '76516', '8050759639459', NULL, 4),
(56, 'CA 1008.100 IPC', 'LOMBOK BASE 2A 100x50xH40 NATURAL TEAK', NULL, 100.00, 50.00, 40.00, 108.00, 58.00, 47.00, 0.2944, 'Natural Light', 32.00, 30.00, 32.00, 30.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:54:37', '2025-12-15 03:21:54', '76518', '8050759639411', NULL, 4),
(57, ' CA 1008.120 IPC', 'LOMBOK BASE 3A 120x50xH40 NATURAL TEAK', NULL, 120.00, 50.00, 40.00, 128.00, 58.00, 47.00, 0.3489, 'Natural Light', 36.00, 34.00, 36.00, 34.00, 0.00, 0.00, '9403.60.90', '2025-12-15 02:56:59', '2025-12-15 03:22:16', '76520', '8050759639374', NULL, 4),
(58, 'DI-502.50 IPC', 'LOMBOK SPECCHIO 50x70 CORNICE TEAK', NULL, 50.00, 3.00, 70.00, 57.00, 10.00, 77.00, 0.0439, 'Natural Light', 6.00, 5.00, 6.00, 5.00, 0.00, 0.00, '7009.92.00', '2025-12-15 03:02:25', '2025-12-15 03:22:29', '76714', '8050759640981', NULL, 4),
(59, 'DI-502.60 IPC', 'LOMBOK SPECCHIO 60x70 CORNICE NATURAL TEAK', NULL, 60.00, 3.00, 70.00, 67.00, 10.00, 77.00, 0.0516, 'Natural Light', 7.00, 6.00, 7.00, 6.00, 0.00, 0.00, '7009.92.00', '2025-12-15 03:03:46', '2025-12-15 03:22:45', '76515', '8050759639473', NULL, 4),
(60, 'DI-502.80 IPC', 'LOMBOK SPECCHIO 80x70 CORNICE NATURAL TEAK', NULL, 80.00, 3.00, 70.00, 87.00, 10.00, 70.00, 0.0609, 'Natural Light', 8.00, 7.00, 8.00, 7.00, 0.00, 0.00, '7009.92.00', '2025-12-15 03:08:13', '2025-12-15 03:22:54', '76517', '8050759639435', NULL, 4),
(61, 'DI-502.100 IPC', 'LOMBOK SPECCHIO 100x70 CORNICE NATURAL TEAK', NULL, 100.00, 3.00, 70.00, 107.00, 10.00, 77.00, 0.0824, 'Natural Light', 10.00, 9.00, 10.00, 9.00, 0.00, 0.00, '7009.92.00', '2025-12-15 03:09:18', '2025-12-15 03:23:06', '76519', '8050759639398', NULL, 4),
(62, 'DI-502.120 IPC', 'LOMBOK SPECCHIO 120x70 CORNICE NATURAL TEAK', NULL, 120.00, 3.00, 70.00, 127.00, 10.00, 77.00, 0.0978, 'Natural Light', 11.50, 10.50, 11.50, 10.50, 0.00, 0.00, '7009.92.00', '2025-12-15 03:10:30', '2025-12-15 03:23:31', '76521', '8050759639350', NULL, 4),
(63, 'CA 933 IPC', 'LOMBOK PENSILE 2A 25x25xH100 NATURAL TEAK', NULL, 25.00, 25.00, 100.00, 33.00, 33.00, 110.00, 0.1198, 'Natural Light', 14.00, 12.00, 14.00, 12.00, 0.00, 0.00, '9403.60.90', '2025-12-15 03:12:46', '2025-12-15 03:23:41', '76522', '8050759639336', NULL, 4),
(64, 'DI 802 IPC', 'LOMBOK PORTABIANCHERIA NATURAL TEAK', NULL, 35.00, 35.00, 60.00, 43.00, 43.00, 70.00, 0.1294, 'Natural Light', 14.00, 12.00, 14.00, 12.00, 0.00, 0.00, '9403.60.90', '2025-12-15 03:14:15', '2025-12-15 03:23:52', '76523', '8050759639312', NULL, 4),
(65, 'CH 406 IPC', 'LOMBOK SGABELLO 4 GAMBE NATURAL TEAK', NULL, 40.00, 30.00, 46.00, 44.00, 40.00, 18.00, 0.0317, 'Natural Light', 4.50, 3.50, 4.50, 3.50, 0.00, 0.00, '9403.60.90', '2025-12-15 03:27:11', '2025-12-15 03:27:47', '76524', '8050759639299', NULL, 4),
(66, 'CA??? IPC', 'LOMBOK COLONNA 2A/1C NATURAL TEAK', NULL, 40.00, 40.00, 185.00, 48.00, 48.00, 195.00, 0.4493, 'Natural Light', 30.00, 28.00, 30.00, 28.00, 0.00, 0.00, '9403.60.90', '2025-12-15 03:39:56', '2025-12-15 03:40:05', '76525', '8050759639275', NULL, 4),
(67, 'CA 845 IPC', 'LOMBOK COLONNA SOSP 2A/1C NATURAL TEAK', NULL, 40.00, 40.00, 171.00, 48.00, 48.00, 178.00, 0.4101, 'Natural Light', 30.00, 28.00, 30.00, 28.00, 0.00, 0.00, '9403.60.90', '2025-12-15 03:41:53', '2025-12-15 03:55:52', '80293', '8050759658962', NULL, 4),
(68, 'CA 845 Legs IPC', 'LOMBOK SET PIEDINI PER COLONNA NATURAL TEAK', NULL, 40.00, 40.00, 14.00, 48.00, 48.00, 24.00, 0.0553, 'Natural Smooth', 3.00, 2.00, 3.00, 2.00, 0.00, 0.00, '9403.60.90', '2025-12-15 03:59:23', '2025-12-15 03:59:23', '76506', '8050759639657', NULL, 4),
(69, 'CA-1111-90 IPC', 'BORNEO BASE 1C 90x51Xh30 NAT TEAK', NULL, 90.00, 51.00, 30.00, 98.00, 59.00, 40.00, 0.2313, 'Natural Light', 33.00, 28.00, 33.00, 28.00, 0.00, 0.00, '9403.60.90', '2025-12-15 04:01:23', '2025-12-15 04:03:13', '80165', '8050759659433', NULL, 4),
(70, 'CA-1111-140 IPC', 'BORNEO BASE 2C 140x51Xh30 NAT TEAK', NULL, 140.00, 51.00, 30.00, 148.00, 59.00, 40.00, 0.3493, 'Natural Light', 40.50, 35.50, 40.50, 35.50, 0.00, 0.00, '9403.60.90', '2025-12-15 04:02:56', '2025-12-15 04:02:56', '80166', '8050759659440', NULL, 4),
(71, 'CA-859 IPC', 'BORNEO PENSILE 25x25xxH100 NATURAL TEAK', NULL, 25.00, 25.00, 100.00, 0.00, 0.00, 0.00, 0.0000, 'Natural Light', 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, '9403.60.90', '2025-12-15 04:04:14', '2025-12-15 04:06:47', '80167', '8050759659457', NULL, 4),
(72, 'T-01 WT IPC', 'TERRAZZO LAVABO CIOTOLA Ã˜40xH11 BIANCO', NULL, 40.00, 40.00, 11.00, 47.00, 47.00, 22.00, 0.0486, 'White', 10.00, 9.00, 10.00, 9.00, 0.00, 0.00, '6910.90.00', '2025-12-15 04:06:25', '2025-12-15 04:08:07', '76526', '8050759639251', NULL, 4),
(73, 'T-04 WT IPC', 'TERRAZZO LAVABO CONO Ã˜40xH12 BIANCO', NULL, 40.00, 40.00, 12.00, 47.00, 47.00, 22.00, 0.0486, 'White', 8.00, 7.00, 8.00, 7.00, 0.00, 0.00, '6910.90.00', '2025-12-15 04:08:02', '2025-12-15 04:08:02', '76527', '8050759639237', NULL, 4);

-- --------------------------------------------------------

--
-- Struktur dari tabel `product_folders`
--

CREATE TABLE `product_folders` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL COMMENT 'Folder name',
  `description` text DEFAULT NULL COMMENT 'Folder description',
  `color` varchar(50) DEFAULT NULL COMMENT 'Folder color for UI display',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Product folders for organizing products into categories';

--
-- Dumping data untuk tabel `product_folders`
--

INSERT INTO `product_folders` (`id`, `name`, `description`, `color`, `created_at`, `updated_at`) VALUES
(1, 'KM Original', 'ORIGINAL ITEM KM', '#004dd1', '2025-12-14 10:51:22', '2025-12-15 01:45:47'),
(3, 'SKLUM', 'Sklum SPE item', '#10B981', '2025-12-15 01:27:24', '2025-12-15 01:45:17'),
(4, 'IPERCERAMICA', 'IPC SPE item', '#3bb8f7', '2025-12-15 01:44:09', '2025-12-15 01:45:37');

-- --------------------------------------------------------

--
-- Stand-in struktur untuk tampilan `v_order_summary`
-- (Lihat di bawah untuk tampilan aktual)
--
CREATE TABLE `v_order_summary` (
`id` int(11)
,`no_pi` varchar(100)
,`buyer_name` varchar(255)
,`buyer_address` text
,`created_at` timestamp
,`item_count` bigint(21)
,`total_cbm` decimal(32,4)
,`total_fob_usd` decimal(34,2)
,`total_gross_weight` decimal(32,2)
,`total_net_weight` decimal(32,2)
,`total_gw` decimal(32,2)
,`total_nw` decimal(32,2)
);

-- --------------------------------------------------------

--
-- Stand-in struktur untuk tampilan `v_product_popularity`
-- (Lihat di bawah untuk tampilan aktual)
--
CREATE TABLE `v_product_popularity` (
`id` int(11)
,`km_code` varchar(100)
,`description` text
,`color` varchar(100)
,`fob_price` decimal(12,2)
,`total_ordered` decimal(32,0)
,`orders_count` bigint(21)
,`total_revenue` decimal(34,2)
);

--
-- Indexes for dumped tables
--

--
-- Indeks untuk tabel `buyers`
--
ALTER TABLE `buyers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- Indeks untuk tabel `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `no_pi` (`no_pi`),
  ADD KEY `idx_no_pi` (`no_pi`),
  ADD KEY `idx_buyer_name` (`buyer_name`),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_orders_date_range` (`created_at`),
  ADD KEY `idx_orders_currency` (`currency`),
  ADD KEY `idx_buyer_id` (`buyer_id`),
  ADD KEY `idx_template_type` (`template_type`);

--
-- Indeks untuk tabel `order_items`
--
ALTER TABLE `order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_order_id` (`order_id`),
  ADD KEY `idx_product_id` (`product_id`),
  ADD KEY `idx_client_code` (`client_code`),
  ADD KEY `idx_order_items_date_range` (`created_at`),
  ADD KEY `idx_order_items_unit_price` (`unit_price`);

--
-- Indeks untuk tabel `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `km_code` (`km_code`),
  ADD KEY `idx_km_code` (`km_code`),
  ADD KEY `idx_description` (`description`(100)),
  ADD KEY `idx_created_at` (`created_at`),
  ADD KEY `idx_products_price_range` (`fob_price`),
  ADD KEY `idx_products_folder_id` (`folder_id`),
  ADD KEY `idx_client_code` (`client_code`),
  ADD KEY `idx_client_barcode` (`client_barcode`);

--
-- Indeks untuk tabel `product_folders`
--
ALTER TABLE `product_folders`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_name` (`name`),
  ADD KEY `idx_created_at` (`created_at`);

--
-- AUTO_INCREMENT untuk tabel yang dibuang
--

--
-- AUTO_INCREMENT untuk tabel `buyers`
--
ALTER TABLE `buyers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT untuk tabel `orders`
--
ALTER TABLE `orders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT untuk tabel `order_items`
--
ALTER TABLE `order_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=51;

--
-- AUTO_INCREMENT untuk tabel `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=74;

--
-- AUTO_INCREMENT untuk tabel `product_folders`
--
ALTER TABLE `product_folders`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

-- --------------------------------------------------------

--
-- Struktur untuk view `v_order_summary`
--
DROP TABLE IF EXISTS `v_order_summary`;

CREATE ALGORITHM=UNDEFINED DEFINER=`isad8273`@`localhost` SQL SECURITY DEFINER VIEW `v_order_summary`  AS SELECT `o`.`id` AS `id`, `o`.`no_pi` AS `no_pi`, `o`.`buyer_name` AS `buyer_name`, `o`.`buyer_address` AS `buyer_address`, `o`.`created_at` AS `created_at`, count(`oi`.`id`) AS `item_count`, coalesce(sum(`oi`.`cbm_total`),0) AS `total_cbm`, coalesce(sum(`oi`.`fob_total_usd`),0) AS `total_fob_usd`, coalesce(sum(`oi`.`gross_weight_total`),0) AS `total_gross_weight`, coalesce(sum(`oi`.`net_weight_total`),0) AS `total_net_weight`, coalesce(sum(`oi`.`total_gw_total`),0) AS `total_gw`, coalesce(sum(`oi`.`total_nw_total`),0) AS `total_nw` FROM (`orders` `o` left join `order_items` `oi` on(`o`.`id` = `oi`.`order_id`)) GROUP BY `o`.`id`, `o`.`no_pi`, `o`.`buyer_name`, `o`.`buyer_address`, `o`.`created_at` ;

-- --------------------------------------------------------

--
-- Struktur untuk view `v_product_popularity`
--
DROP TABLE IF EXISTS `v_product_popularity`;

CREATE ALGORITHM=UNDEFINED DEFINER=`isad8273`@`localhost` SQL SECURITY DEFINER VIEW `v_product_popularity`  AS SELECT `p`.`id` AS `id`, `p`.`km_code` AS `km_code`, `p`.`description` AS `description`, `p`.`color` AS `color`, `p`.`fob_price` AS `fob_price`, coalesce(sum(`oi`.`qty`),0) AS `total_ordered`, coalesce(count(distinct `oi`.`order_id`),0) AS `orders_count`, coalesce(sum(`oi`.`fob_total_usd`),0) AS `total_revenue` FROM (`products` `p` left join `order_items` `oi` on(`p`.`id` = `oi`.`product_id`)) GROUP BY `p`.`id`, `p`.`km_code`, `p`.`description`, `p`.`color`, `p`.`fob_price` ORDER BY coalesce(sum(`oi`.`qty`),0) DESC ;

--
-- Ketidakleluasaan untuk tabel pelimpahan (Dumped Tables)
--

--
-- Ketidakleluasaan untuk tabel `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_orders_buyer` FOREIGN KEY (`buyer_id`) REFERENCES `buyers` (`id`);

--
-- Ketidakleluasaan untuk tabel `order_items`
--
ALTER TABLE `order_items`
  ADD CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Ketidakleluasaan untuk tabel `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_folder` FOREIGN KEY (`folder_id`) REFERENCES `product_folders` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
