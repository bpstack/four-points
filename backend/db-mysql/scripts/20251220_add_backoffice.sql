-- =============================================================================
-- 20251220_add_backoffice.sql  [RETROACTIVE — historical]
-- =============================================================================
-- Restores migration history for the Backoffice module (commit 4bc0543).
-- Original change: 5 tables (bo_categories, bo_suppliers, bo_invoices,
-- bo_invoice_history, bo_assets) + 3 views (v_bo_invoices_detail,
-- v_bo_monthly_summary, v_bo_suppliers_stats).
--
-- Schema captured live from Aiven on 2026-05-20 (current state of those
-- tables/views, may include later micro-tweaks since 2025-12-20).
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + CREATE OR REPLACE VIEW.
-- Safe to run multiple times. No-op on a BD where backoffice already exists.
-- =============================================================================
USE hotel_db;

CREATE TABLE IF NOT EXISTS `bo_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cost_center` varchar(100) NOT NULL,
  `department` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cost_center_department` (`cost_center`,`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `bo_suppliers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `cif` varchar(20) DEFAULT NULL,
  `default_category_id` int DEFAULT NULL,
  `periodicity` enum('monthly','bimonthly','quarterly','annual','on_demand') DEFAULT 'monthly',
  `payment_method` enum('transfer','direct_debit') DEFAULT 'transfer',
  `bank_account` varchar(50) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `address` text,
  `notes` text,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_supplier_name` (`name`),
  KEY `idx_supplier_active` (`is_active`),
  KEY `idx_supplier_category` (`default_category_id`),
  KEY `fk_supplier_created_by` (`created_by`),
  CONSTRAINT `fk_supplier_category` FOREIGN KEY (`default_category_id`) REFERENCES `bo_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_supplier_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `bo_invoices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_number` varchar(100) NOT NULL,
  `supplier_id` int NOT NULL,
  `category_id` int DEFAULT NULL,
  `amount_without_vat` decimal(12,2) NOT NULL,
  `amount_with_vat` decimal(12,2) NOT NULL,
  `vat_percentage` decimal(5,2) DEFAULT '21.00',
  `invoice_date` date NOT NULL,
  `received_date` date DEFAULT NULL,
  `billing_period_start` date DEFAULT NULL,
  `billing_period_end` date DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `paid_date` date DEFAULT NULL,
  `status` enum('pending','validated','rejected','paid') DEFAULT 'pending',
  `payment_method` enum('transfer','direct_debit') NOT NULL,
  `original_pdf_url` varchar(500) DEFAULT NULL,
  `original_pdf_public_id` varchar(255) DEFAULT NULL,
  `validated_pdf_url` varchar(500) DEFAULT NULL,
  `validated_pdf_public_id` varchar(255) DEFAULT NULL,
  `validated_by` char(36) DEFAULT NULL,
  `validated_at` timestamp NULL DEFAULT NULL,
  `validation_notes` text,
  `notes` text,
  `created_by` char(36) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` char(36) DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deleted` tinyint(1) DEFAULT '0',
  `deleted_at` timestamp NULL DEFAULT NULL,
  `deleted_by` char(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_invoice_supplier` (`supplier_id`),
  KEY `idx_invoice_status` (`status`),
  KEY `idx_invoice_date` (`invoice_date`),
  KEY `idx_invoice_paid_date` (`paid_date`),
  KEY `idx_invoice_category` (`category_id`),
  KEY `idx_invoice_deleted` (`is_deleted`),
  KEY `fk_invoice_validated_by` (`validated_by`),
  KEY `fk_invoice_created_by` (`created_by`),
  KEY `fk_invoice_updated_by` (`updated_by`),
  KEY `fk_invoice_deleted_by` (`deleted_by`),
  CONSTRAINT `fk_invoice_category` FOREIGN KEY (`category_id`) REFERENCES `bo_categories` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_invoice_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `bo_suppliers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_invoice_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_validated_by` FOREIGN KEY (`validated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `bo_invoice_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `invoice_id` int NOT NULL,
  `action` enum('created','updated','validated','rejected','paid','deleted','restored') NOT NULL,
  `field_changed` varchar(50) DEFAULT NULL,
  `old_value` text,
  `new_value` text,
  `notes` text,
  `changed_by` char(36) NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bo_history_invoice` (`invoice_id`),
  KEY `idx_bo_history_action` (`action`),
  KEY `idx_bo_history_date` (`changed_at`),
  KEY `fk_bo_history_changed_by` (`changed_by`),
  CONSTRAINT `fk_bo_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_bo_history_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `bo_invoices` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
CREATE TABLE IF NOT EXISTS `bo_assets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('stamp','signature') NOT NULL,
  `name` varchar(100) NOT NULL,
  `cloudinary_url` varchar(500) NOT NULL,
  `cloudinary_public_id` varchar(255) NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `created_by` char(36) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_asset_type` (`type`),
  KEY `idx_asset_default` (`is_default`),
  KEY `fk_asset_created_by` (`created_by`),
  CONSTRAINT `fk_asset_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Views (re-created if exist)
CREATE OR REPLACE VIEW `v_bo_invoices_detail` AS select `i`.`id` AS `id`,`i`.`invoice_number` AS `invoice_number`,`i`.`supplier_id` AS `supplier_id`,`s`.`name` AS `supplier_name`,`i`.`category_id` AS `category_id`,`c`.`cost_center` AS `cost_center`,`c`.`department` AS `department`,concat(`c`.`cost_center`,' / ',`c`.`department`) AS `category_full`,`i`.`amount_without_vat` AS `amount_without_vat`,`i`.`amount_with_vat` AS `amount_with_vat`,`i`.`vat_percentage` AS `vat_percentage`,`i`.`invoice_date` AS `invoice_date`,`i`.`received_date` AS `received_date`,`i`.`billing_period_start` AS `billing_period_start`,`i`.`billing_period_end` AS `billing_period_end`,`i`.`due_date` AS `due_date`,`i`.`paid_date` AS `paid_date`,`i`.`status` AS `status`,`i`.`payment_method` AS `payment_method`,`i`.`original_pdf_url` AS `original_pdf_url`,`i`.`validated_pdf_url` AS `validated_pdf_url`,`i`.`validated_by` AS `validated_by`,`u_val`.`username` AS `validated_by_name`,`i`.`validated_at` AS `validated_at`,`i`.`validation_notes` AS `validation_notes`,`i`.`notes` AS `notes`,`i`.`created_by` AS `created_by`,`u_cre`.`username` AS `created_by_name`,`i`.`created_at` AS `created_at`,`i`.`updated_at` AS `updated_at`,`i`.`is_deleted` AS `is_deleted` from ((((`bo_invoices` `i` left join `bo_suppliers` `s` on((`i`.`supplier_id` = `s`.`id`))) left join `bo_categories` `c` on((`i`.`category_id` = `c`.`id`))) left join `users` `u_val` on((`i`.`validated_by` = `u_val`.`id`))) left join `users` `u_cre` on((`i`.`created_by` = `u_cre`.`id`)));
CREATE OR REPLACE VIEW `v_bo_monthly_summary` AS select year(`i`.`invoice_date`) AS `year`,month(`i`.`invoice_date`) AS `month`,date_format(`i`.`invoice_date`,'%Y-%m') AS `period`,count(0) AS `total_invoices`,count((case when (`i`.`status` = 'pending') then 1 end)) AS `pending_count`,count((case when (`i`.`status` = 'paid') then 1 end)) AS `paid_count`,sum(`i`.`amount_without_vat`) AS `total_without_vat`,sum(`i`.`amount_with_vat`) AS `total_with_vat`,sum((case when (`i`.`status` = 'pending') then `i`.`amount_with_vat` else 0 end)) AS `pending_total`,sum((case when (`i`.`status` = 'paid') then `i`.`amount_with_vat` else 0 end)) AS `paid_total` from `bo_invoices` `i` where (`i`.`is_deleted` = 0) group by year(`i`.`invoice_date`),month(`i`.`invoice_date`) order by `year` desc,`month` desc;
CREATE OR REPLACE VIEW `v_bo_suppliers_stats` AS select `s`.`id` AS `id`,`s`.`name` AS `name`,`s`.`cif` AS `cif`,`s`.`default_category_id` AS `default_category_id`,`c`.`cost_center` AS `cost_center`,`c`.`department` AS `department`,concat(`c`.`cost_center`,' / ',`c`.`department`) AS `category_full`,`s`.`periodicity` AS `periodicity`,`s`.`payment_method` AS `payment_method`,`s`.`bank_account` AS `bank_account`,`s`.`email` AS `email`,`s`.`phone` AS `phone`,`s`.`address` AS `address`,`s`.`notes` AS `notes`,`s`.`is_active` AS `is_active`,count(distinct `i`.`id`) AS `total_invoices`,count(distinct (case when (`i`.`status` = 'pending') then `i`.`id` end)) AS `pending_invoices`,count(distinct (case when (`i`.`status` = 'paid') then `i`.`id` end)) AS `paid_invoices`,coalesce(sum((case when ((year(`i`.`invoice_date`) = year(curdate())) and (`i`.`is_deleted` = 0)) then `i`.`amount_with_vat` end)),0) AS `ytd_total`,max(`i`.`invoice_date`) AS `last_invoice_date` from ((`bo_suppliers` `s` left join `bo_categories` `c` on((`s`.`default_category_id` = `c`.`id`))) left join `bo_invoices` `i` on(((`s`.`id` = `i`.`supplier_id`) and (`i`.`is_deleted` = 0)))) group by `s`.`id`;
