-- =============================================================================
-- schema.sql: estructura de la BD tal como está en producción
-- Generado con scripts/snapshot-schema.sh: no se edita a mano.
-- Lo carga setup-local.ts sobre una base vacía; luego van los scripts posteriores.
-- =============================================================================


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `blacklist_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blacklist_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guest_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `document_type` enum('DNI','PASSPORT','NIE','OTHER') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `document_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `check_in_date` date NOT NULL,
  `check_out_date` date NOT NULL,
  `reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `severity` enum('LOW','MEDIUM','HIGH','CRITICAL') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'MEDIUM',
  `comments` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `images` json NOT NULL,
  `status` enum('ACTIVE','DELETED') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'ACTIVE',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `audit_trail` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_blacklist_deleted_by` (`deleted_by`),
  KEY `idx_document_number` (`document_number`),
  KEY `idx_guest_name` (`guest_name`(100)),
  KEY `idx_severity` (`severity`),
  KEY `idx_status` (`status`),
  KEY `idx_check_in_date` (`check_in_date`),
  KEY `idx_check_out_date` (`check_out_date`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_status_severity` (`status`,`severity`),
  KEY `idx_status_created_at` (`status`,`created_at` DESC),
  CONSTRAINT `fk_blacklist_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_blacklist_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bo_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bo_assets` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bo_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bo_categories` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bo_invoice_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bo_invoice_history` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bo_invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bo_invoices` (
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
  UNIQUE KEY `uk_invoice_supplier_number` (`supplier_id`,`invoice_number`),
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `bo_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bo_suppliers` (
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
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_daily`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_daily` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `total_cash` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de income de los 4 turnos',
  `total_card` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de TARJETA',
  `total_bacs` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de BACS',
  `total_web_payment` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de WEB PAYMENT',
  `total_transfer` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de TRANSFERENCIA',
  `total_other` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de OTROS',
  `grand_total` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma total del día',
  `status` enum('open','closed') DEFAULT 'open',
  `closed_by` char(36) DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `notes` text COMMENT 'Observaciones del cierre diario',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`),
  KEY `fk_daily_closed_by` (`closed_by`),
  KEY `idx_daily_date` (`date`),
  KEY `idx_daily_status` (`status`),
  CONSTRAINT `fk_daily_closed_by` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_denominations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_denominations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_id` int NOT NULL COMMENT 'Turno asociado',
  `denomination` decimal(10,2) NOT NULL COMMENT 'Valor del billete/moneda',
  `quantity` int DEFAULT '0' COMMENT 'Cantidad de unidades',
  `total` decimal(10,2) GENERATED ALWAYS AS ((`denomination` * `quantity`)) STORED COMMENT 'Total calculado',
  PRIMARY KEY (`id`),
  KEY `idx_shift_denom` (`shift_id`,`denomination`),
  CONSTRAINT `fk_denom_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_id` int NOT NULL COMMENT 'Turno afectado',
  `action` enum('created','updated','deleted','status_changed','adjustment','voucher_created','voucher_repaid','daily_closed','daily_reopened') NOT NULL,
  `table_affected` varchar(100) DEFAULT NULL COMMENT 'Tabla modificada',
  `record_id` int DEFAULT NULL COMMENT 'ID del registro modificado',
  `field_changed` varchar(100) DEFAULT NULL COMMENT 'Campo modificado',
  `old_value` text COMMENT 'Valor anterior',
  `new_value` text COMMENT 'Valor nuevo',
  `changed_by` char(36) DEFAULT NULL COMMENT 'Usuario que realizó el cambio',
  `changed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `notes` text COMMENT 'Notas adicionales',
  PRIMARY KEY (`id`),
  KEY `fk_cashier_history_user` (`changed_by`),
  KEY `idx_history_shift` (`shift_id`),
  KEY `idx_history_action` (`action`),
  KEY `idx_history_changed_at` (`changed_at`),
  CONSTRAINT `fk_cashier_history_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cashier_history_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_id` int NOT NULL COMMENT 'Turno asociado',
  `payment_method_id` int NOT NULL COMMENT 'Método de pago',
  `amount` decimal(10,2) DEFAULT '0.00' COMMENT 'Monto del método',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shift_method` (`shift_id`,`payment_method_id`),
  KEY `idx_payment_method` (`payment_method_id`),
  CONSTRAINT `fk_payment_method` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_payment_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_shift_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_shift_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_id` int NOT NULL,
  `user_id` char(36) NOT NULL,
  `is_primary` tinyint(1) DEFAULT '0' COMMENT '1 = responsable principal, 0 = secundario',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shift_user` (`shift_id`,`user_id`),
  KEY `idx_shift_users` (`shift_id`),
  KEY `idx_user_shifts` (`user_id`),
  CONSTRAINT `fk_shift_user_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_user_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_shift_vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_shift_vouchers` (
  `shift_id` int NOT NULL COMMENT 'Turno que ve el vale',
  `voucher_id` int NOT NULL COMMENT 'Vale activo en ese turno',
  PRIMARY KEY (`shift_id`,`voucher_id`),
  KEY `idx_sv_voucher` (`voucher_id`),
  CONSTRAINT `fk_sv_shift` FOREIGN KEY (`shift_id`) REFERENCES `cashier_shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sv_voucher` FOREIGN KEY (`voucher_id`) REFERENCES `cashier_vouchers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cashier_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `shift_date` date NOT NULL COMMENT 'Fecha del turno',
  `shift_type` enum('night','morning','afternoon','closing') NOT NULL COMMENT 'Tipo de turno',
  `status` enum('open','in_progress','closed','audited') DEFAULT 'open' COMMENT 'Estado del turno',
  `initial_fund` decimal(10,2) DEFAULT '200.00' COMMENT 'Fondo inicial fijo',
  `income` decimal(10,2) DEFAULT '0.00' COMMENT 'Ventas del turno = Retirado a Office',
  `income_breakdown` json DEFAULT NULL COMMENT 'Desglose futuro: {alojamiento: X, restaurante: Y, etc}',
  `cash_counted` decimal(10,2) DEFAULT '0.00' COMMENT 'Efectivo contado físicamente',
  `cash_expected` decimal(10,2) DEFAULT '200.00' COMMENT '200 - vales_activos',
  `difference` decimal(10,2) DEFAULT '0.00' COMMENT 'cash_counted - cash_expected',
  `payments_total` decimal(10,2) DEFAULT '0.00' COMMENT 'Suma de pagos electrónicos',
  `grand_total` decimal(10,2) DEFAULT '0.00' COMMENT 'income + payments_total',
  `notes` text COMMENT 'Observaciones generales',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `closed_at` datetime DEFAULT NULL COMMENT 'Fecha/hora de cierre',
  `closed_by_id` char(36) DEFAULT NULL COMMENT 'Usuario que cerró el turno',
  `opened_by` char(36) DEFAULT NULL COMMENT 'Usuario que abrió el turno',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shift_date_type` (`shift_date`,`shift_type`),
  KEY `fk_shift_opened_by` (`opened_by`),
  KEY `fk_shift_closed_by` (`closed_by_id`),
  KEY `idx_shift_date` (`shift_date`),
  KEY `idx_shift_status` (`status`),
  KEY `idx_shift_type` (`shift_type`),
  KEY `idx_closed_at` (`closed_at`),
  CONSTRAINT `fk_shift_closed_by` FOREIGN KEY (`closed_by_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_shift_opened_by` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_cashier_shift_update_daily` AFTER UPDATE ON `cashier_shifts` FOR EACH ROW BEGIN
  DECLARE v_daily_id INT;
  DECLARE v_total_cash    DECIMAL(10,2);
  DECLARE v_total_card    DECIMAL(10,2);
  DECLARE v_total_bacs    DECIMAL(10,2);
  DECLARE v_total_web     DECIMAL(10,2);
  DECLARE v_total_transfer DECIMAL(10,2);
  DECLARE v_total_other   DECIMAL(10,2);

  IF NEW.status != OLD.status OR NEW.income != OLD.income OR NEW.payments_total != OLD.payments_total THEN

    SELECT id INTO v_daily_id
    FROM cashier_daily
    WHERE date = NEW.shift_date;

    IF v_daily_id IS NULL THEN
      INSERT INTO cashier_daily (date) VALUES (NEW.shift_date);
      SET v_daily_id = LAST_INSERT_ID();
    END IF;

    -- Efectivo: suma income directamente de los turnos cerrados (sin JOIN)
    SELECT COALESCE(SUM(income), 0)
    INTO v_total_cash
    FROM cashier_shifts
    WHERE shift_date = NEW.shift_date
      AND status = 'closed';

    -- Pagos electrónicos: subquery agregado por método para evitar multiplicar filas
    SELECT
      COALESCE(SUM(CASE WHEN payment_method_id = 1 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 2 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 3 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 4 THEN amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method_id = 5 THEN amount ELSE 0 END), 0)
    INTO v_total_card, v_total_bacs, v_total_web, v_total_transfer, v_total_other
    FROM cashier_payments
    WHERE shift_id IN (
      SELECT id FROM cashier_shifts
      WHERE shift_date = NEW.shift_date AND status = 'closed'
    );

    UPDATE cashier_daily
    SET
      total_cash        = v_total_cash,
      total_card        = v_total_card,
      total_bacs        = v_total_bacs,
      total_web_payment = v_total_web,
      total_transfer    = v_total_transfer,
      total_other       = v_total_other,
      grand_total       = v_total_cash + v_total_card + v_total_bacs
                          + v_total_web + v_total_transfer + v_total_other,
      updated_at        = NOW()
    WHERE id = v_daily_id;

  END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
DROP TABLE IF EXISTS `cashier_vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cashier_vouchers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `amount` decimal(10,2) NOT NULL COMMENT 'Monto del vale',
  `reason` text NOT NULL COMMENT 'Justificación del vale',
  `status` enum('pending','justified','cancelled') NOT NULL DEFAULT 'pending' COMMENT 'Estado del vale',
  `justified_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `notes` text COMMENT 'Notas adicionales del vale',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `created_by` char(36) DEFAULT NULL COMMENT 'Usuario que creó el vale',
  PRIMARY KEY (`id`),
  KEY `fk_voucher_created_by` (`created_by`),
  KEY `idx_voucher_status` (`status`),
  KEY `idx_voucher_created_at` (`created_at`),
  CONSTRAINT `fk_voucher_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `checklist_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_config` (
  `hotel_id` int NOT NULL,
  `daily_reset_time` time NOT NULL DEFAULT '06:30:00',
  `timezone` varchar(50) NOT NULL DEFAULT 'Europe/Madrid',
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`hotel_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `checklist_event_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_event_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` bigint NOT NULL,
  `step_id` varchar(100) DEFAULT NULL,
  `user_id` char(36) NOT NULL,
  `action` enum('check','uncheck','comment','attach','reset_manual','reset_cron') NOT NULL,
  `payload_json` json DEFAULT NULL,
  `at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_run_at` (`run_id`,`at`),
  KEY `idx_user` (`user_id`,`at`),
  CONSTRAINT `checklist_event_log_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `checklist_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `checklist_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_runs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `checklist_id` varchar(100) NOT NULL,
  `hotel_id` int NOT NULL DEFAULT '1',
  `hotel_date` date NOT NULL,
  `shift` enum('morning','afternoon','night') DEFAULT NULL,
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reset_at` datetime DEFAULT NULL,
  `reset_by_user_id` char(36) DEFAULT NULL,
  `reset_reason` enum('cron','manual') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_run` (`hotel_id`,`checklist_id`,`hotel_date`),
  KEY `idx_active` (`hotel_id`,`checklist_id`,`reset_at`),
  KEY `idx_hotel_date` (`hotel_id`,`hotel_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `checklist_step_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_step_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` bigint NOT NULL,
  `step_id` varchar(100) NOT NULL,
  `user_id` char(36) NOT NULL,
  `file_url` varchar(500) NOT NULL,
  `public_id` varchar(255) NOT NULL,
  `mime` varchar(100) NOT NULL,
  `size` int NOT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_step` (`run_id`,`step_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `checklist_step_attachments_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `checklist_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `checklist_step_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_step_comments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `run_id` bigint NOT NULL,
  `step_id` varchar(100) NOT NULL,
  `user_id` char(36) NOT NULL,
  `body` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_step` (`run_id`,`step_id`),
  KEY `idx_user` (`user_id`),
  CONSTRAINT `checklist_step_comments_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `checklist_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `checklist_step_state`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `checklist_step_state` (
  `run_id` bigint NOT NULL,
  `step_id` varchar(100) NOT NULL,
  `done` tinyint(1) NOT NULL DEFAULT '0',
  `done_by_user_id` char(36) DEFAULT NULL,
  `done_at` datetime DEFAULT NULL,
  PRIMARY KEY (`run_id`,`step_id`),
  KEY `idx_done_by` (`done_by_user_id`),
  CONSTRAINT `checklist_step_state_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `checklist_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conciliation_housekeeping`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conciliation_housekeeping` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conciliation_id` int NOT NULL,
  `reason` enum('cleaned','do_not_disturb','ooo_cleaned','pending_cleaned','pending_to_clean','room_clean','other') NOT NULL,
  `direction` enum('add','subtract') NOT NULL DEFAULT 'add',
  `value` int DEFAULT '0',
  `room_number` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_housekeeping_created_by` (`created_by`),
  KEY `fk_housekeeping_updated_by` (`updated_by`),
  KEY `idx_housekeeping_conciliation` (`conciliation_id`),
  KEY `idx_housekeeping_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_housekeeping_conciliation` FOREIGN KEY (`conciliation_id`) REFERENCES `conciliation_summary` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_housekeeping_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_housekeeping_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conciliation_monthly_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conciliation_monthly_summary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL,
  `month` int NOT NULL,
  `status` enum('draft','confirmed','closed') DEFAULT 'draft',
  `closed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_year_month` (`year`,`month`),
  KEY `fk_monthly_closed_by` (`closed_by`),
  KEY `idx_monthly_status` (`status`),
  CONSTRAINT `fk_monthly_closed_by` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `conciliation_monthly_summary_chk_1` CHECK ((`month` between 1 and 12))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conciliation_reception`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conciliation_reception` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conciliation_id` int NOT NULL,
  `reason` enum('base_rooms','no_show','room_change','gratuity','other') NOT NULL,
  `direction` enum('add','subtract') NOT NULL DEFAULT 'add',
  `value` int DEFAULT '0',
  `room_number` varchar(255) DEFAULT NULL,
  `notes` text,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_reception_created_by` (`created_by`),
  KEY `fk_reception_updated_by` (`updated_by`),
  KEY `idx_reception_conciliation` (`conciliation_id`),
  KEY `idx_reception_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_reception_conciliation` FOREIGN KEY (`conciliation_id`) REFERENCES `conciliation_summary` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reception_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_reception_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conciliation_summary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conciliation_summary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `total_reception` int DEFAULT '0',
  `total_housekeeping` int DEFAULT '0',
  `difference` int GENERATED ALWAYS AS ((`total_housekeeping` - `total_reception`)) STORED,
  `notes` text,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `status` enum('draft','confirmed','closed') DEFAULT 'draft',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `date` (`date`),
  KEY `fk_conciliation_created_by` (`created_by`),
  KEY `fk_conciliation_updated_by` (`updated_by`),
  KEY `fk_conciliation_department` (`department_id`),
  KEY `idx_conciliation_date` (`date`),
  KEY `idx_conciliation_status` (`status`),
  KEY `idx_conciliation_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_conciliation_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_conciliation_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_conciliation_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conversation_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversation_participants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `user_id` char(36) NOT NULL,
  `joined_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Cuando se unio',
  `last_read_at` timestamp NULL DEFAULT NULL COMMENT 'Ultimo momento de lectura',
  `is_admin` tinyint(1) DEFAULT '0' COMMENT 'Es admin del grupo',
  `is_active` tinyint(1) DEFAULT '1' COMMENT 'Sigue activo en la conversacion',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_participant` (`conversation_id`,`user_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_conversation_id` (`conversation_id`),
  KEY `idx_user_active` (`user_id`,`is_active`),
  CONSTRAINT `fk_part_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_part_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Participantes de conversaciones';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type` enum('dm','group') NOT NULL DEFAULT 'dm' COMMENT 'Tipo: dm=directo, group=grupo',
  `name` varchar(100) DEFAULT NULL COMMENT 'Nombre del grupo (NULL para DMs)',
  `created_by` char(36) NOT NULL COMMENT 'Usuario que creo la conversacion',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_at` (`updated_at`),
  CONSTRAINT `fk_conv_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Conversaciones de mensajeria (DMs y grupos)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cron_job_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cron_job_runs` (
  `job` varchar(64) NOT NULL,
  `last_period` varchar(16) NOT NULL COMMENT 'YYYY-MM-DD (the day, or the Monday of the week) or YYYY-MM',
  `last_status` enum('running','ok','error') NOT NULL,
  `last_run_at` datetime NOT NULL,
  `last_error` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`job`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `demo_activity_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `demo_activity_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  `user_id` varchar(36) DEFAULT NULL,
  `username` varchar(100) DEFAULT NULL,
  `method` varchar(10) NOT NULL,
  `route` varchar(255) NOT NULL,
  `body_preview` text,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text,
  `blocked` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `idx_demo_log_timestamp` (`timestamp`),
  KEY `idx_demo_log_username` (`username`),
  KEY `idx_demo_log_route` (`route`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `demo_reset_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `demo_reset_log` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `action` enum('reset','snapshot') NOT NULL COMMENT 'reset: mock + scheduling base; snapshot: base saved',
  `trigger_type` enum('auto','manual') NOT NULL COMMENT 'auto: first demo entry of the day',
  `user_id` varchar(36) DEFAULT NULL COMMENT 'Admin who ran it (manual)',
  `started_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` datetime DEFAULT NULL,
  `ok` tinyint(1) NOT NULL DEFAULT '0',
  `details` varchar(500) DEFAULT NULL COMMENT 'Summary or error code, never SQL text',
  PRIMARY KEY (`id`),
  KEY `idx_demo_reset_log_action_started` (`action`,`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Public demo: daily resets and saved scheduling bases (ADR-038)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `departments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fnb_category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fnb_category` (
  `code` varchar(10) NOT NULL,
  `name` varchar(100) NOT NULL,
  `group_type` enum('breakfast','lunch','dinner') NOT NULL,
  `display_order` tinyint NOT NULL DEFAULT '0',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `fnb_daily_revenue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fnb_daily_revenue` (
  `id` int NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `category_code` varchar(10) NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_date_code` (`date`,`category_code`),
  KEY `fk_fnb_category` (`category_code`),
  CONSTRAINT `fk_fnb_category` FOREIGN KEY (`category_code`) REFERENCES `fnb_category` (`code`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `group_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `contact_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Nombre del contacto',
  `contact_email` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Email del contacto',
  `contact_phone` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Teléfono del contacto',
  `is_primary` tinyint(1) DEFAULT '0' COMMENT 'Contacto principal',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_is_primary` (`is_primary`),
  CONSTRAINT `group_contacts_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Contactos de cada grupo (1-2 por grupo)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `group_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `action` enum('created','updated','deleted','status_changed','payment_updated') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de acción realizada',
  `table_affected` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Tabla afectada (hotel_groups, payments, group_status, etc.)',
  `record_id` int DEFAULT NULL COMMENT 'ID del registro afectado',
  `field_changed` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Campo modificado',
  `old_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Valor anterior',
  `new_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Valor nuevo',
  `changed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que hizo el cambio',
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas opcionales sobre el cambio',
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_action` (`action`),
  KEY `idx_table_affected` (`table_affected`),
  CONSTRAINT `group_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de cambios de grupos para auditoría';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `group_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `payment_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre del pago',
  `payment_order` int NOT NULL DEFAULT '1' COMMENT 'Orden del pago (1, 2, 3...)',
  `percentage` decimal(5,2) DEFAULT NULL COMMENT 'Porcentaje del total (NULL si es cantidad fija)',
  `amount` decimal(10,2) NOT NULL COMMENT 'Cantidad total a pagar',
  `amount_paid` decimal(10,2) DEFAULT '0.00' COMMENT 'Cantidad ya pagada (para pagos parciales)',
  `due_date` date NOT NULL COMMENT 'Fecha límite de pago',
  `status` enum('pending','requested','partial','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending',
  `status_updated_at` datetime DEFAULT NULL COMMENT 'Cuándo cambió el último estado',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas sobre el pago',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_status` (`status`),
  KEY `idx_payment_order` (`payment_order`),
  CONSTRAINT `group_payments_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Pagos de cada grupo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `group_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `room_type` enum('single','double_bed','twin_beds') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de habitación',
  `quantity` int NOT NULL DEFAULT '0' COMMENT 'Número de habitaciones de este tipo',
  `guests_per_room` int NOT NULL DEFAULT '1' COMMENT 'Personas por habitación',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas sobre este tipo de habitación',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_group_room_type` (`group_id`,`room_type`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_room_type` (`room_type`),
  CONSTRAINT `group_rooms_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Habitaciones reservadas por cada grupo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `group_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL COMMENT '1 status por grupo',
  `booking_confirmed` tinyint(1) DEFAULT '0' COMMENT 'Bloqueo confirmado',
  `booking_confirmed_date` datetime DEFAULT NULL,
  `contract_signed` tinyint(1) DEFAULT '0' COMMENT 'Contrato firmado',
  `contract_signed_date` datetime DEFAULT NULL,
  `rooming_status` enum('pending','requested','received') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending',
  `rooming_requested_date` datetime DEFAULT NULL COMMENT 'Cuándo se solicitó',
  `rooming_received_date` datetime DEFAULT NULL COMMENT 'Cuándo se recibió',
  `balance_status` enum('pending','requested','partial','paid') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending',
  `balance_requested_date` datetime DEFAULT NULL,
  `balance_paid_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `group_id` (`group_id`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_rooming_status` (`rooming_status`),
  KEY `idx_balance_status` (`balance_status`),
  CONSTRAINT `group_status_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Estados administrativos de cada grupo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hotel_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hotel_groups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre del grupo',
  `agency` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Agencia intermediaria',
  `arrival_date` date NOT NULL COMMENT 'Fecha de llegada',
  `departure_date` date NOT NULL COMMENT 'Fecha de salida',
  `status` enum('pending','confirmed','in_progress','completed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT 'Estado general del grupo',
  `total_amount` decimal(10,2) DEFAULT NULL COMMENT 'Importe total del grupo (puede ser NULL al inicio)',
  `currency` varchar(3) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'EUR' COMMENT 'Moneda del grupo',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas libres sobre el grupo',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó el grupo',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que hizo la última modificación',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `updated_by` (`updated_by`),
  KEY `idx_arrival_date` (`arrival_date`),
  KEY `idx_departure_date` (`departure_date`),
  KEY `idx_status` (`status`),
  KEY `idx_agency` (`agency`),
  CONSTRAINT `hotel_groups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `hotel_groups_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Información principal de grupos';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logbook_comments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logbook_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `logbook_id` int NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `comment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `department_id` int DEFAULT NULL,
  `importance_level` enum('baja','media','alta','urgente') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_logbook_comments_updated_at` (`updated_at`),
  KEY `idx_logbook_comments_user` (`user_id`),
  KEY `idx_logbook_comments_logbook` (`logbook_id`),
  KEY `idx_logbook_comments_deleted_at` (`deleted_at`),
  CONSTRAINT `fk_comments_logbook` FOREIGN KEY (`logbook_id`) REFERENCES `logbooks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logbook_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logbook_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `logbook_id` int NOT NULL,
  `editor_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `comment_id` int DEFAULT NULL,
  `department_id` int DEFAULT NULL,
  `type` enum('logbook','comment') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `action` enum('create','update','delete','read','unread','solve','reopen') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `previous_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `new_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_history_logbook` (`logbook_id`),
  KEY `fk_history_user` (`editor_id`),
  KEY `fk_history_comment` (`comment_id`),
  KEY `fk_history_department` (`department_id`),
  CONSTRAINT `fk_history_comment` FOREIGN KEY (`comment_id`) REFERENCES `logbook_comments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_history_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_history_logbook` FOREIGN KEY (`logbook_id`) REFERENCES `logbooks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_history_user` FOREIGN KEY (`editor_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logbook_reads`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logbook_reads` (
  `logbook_id` int NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `read_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`logbook_id`,`user_id`),
  KEY `fk_reads_user` (`user_id`),
  CONSTRAINT `fk_reads_logbook` FOREIGN KEY (`logbook_id`) REFERENCES `logbooks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reads_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `logbooks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `logbooks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `author_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `importance_level` enum('baja','media','alta','urgente') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'media',
  `department_id` int DEFAULT NULL,
  `deleted_at` datetime DEFAULT NULL,
  `is_solved` tinyint(1) NOT NULL DEFAULT '0',
  `solved_at` datetime DEFAULT NULL,
  `solved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_logbooks_solved_by` (`solved_by`),
  KEY `idx_logbooks_deleted_at` (`deleted_at`),
  KEY `idx_logbooks_solved_at` (`solved_at`),
  KEY `idx_logbooks_author` (`author_id`),
  KEY `idx_logbooks_department` (`department_id`),
  KEY `idx_logbooks_created_at` (`created_at`),
  CONSTRAINT `fk_logbooks_author` FOREIGN KEY (`author_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_logbooks_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_logbooks_solved_by` FOREIGN KEY (`solved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `maintenance_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `action` enum('created','status_changed','priority_changed','updated','assigned','resolved','closed','deleted','restored') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `field_changed` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `old_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `new_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `changed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_history_changed_by` (`changed_by`),
  KEY `idx_report_id` (`report_id`),
  KEY `idx_action` (`action`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_report_changed_at` (`report_id`,`changed_at` DESC),
  CONSTRAINT `fk_history_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_history_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de cambios en reportes de mantenimiento';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `maintenance_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `report_id` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_path` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `file_size` int unsigned NOT NULL,
  `mime_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `public_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `auto_delete_on_close` tinyint(1) DEFAULT '1',
  `uploaded_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_image_uploaded_by` (`uploaded_by`),
  KEY `idx_report_id` (`report_id`),
  KEY `idx_uploaded_at` (`uploaded_at`),
  CONSTRAINT `fk_image_report` FOREIGN KEY (`report_id`) REFERENCES `maintenance_reports` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_image_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Imágenes de reportes de mantenimiento';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `maintenance_reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_reports` (
  `id` varchar(12) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID formato DDMMYY-XXX',
  `report_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha del reporte',
  `title` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Título del reporte',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Descripción detallada',
  `location_type` enum('room','common_area','exterior','facilities','other') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `location_description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `room_number` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `room_out_of_service` tinyint(1) DEFAULT '0',
  `priority` enum('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'medium',
  `status` enum('reported','assigned','in_progress','waiting','completed','closed','canceled') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'reported',
  `assigned_to` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `assigned_type` enum('internal','external') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `external_company_name` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `external_contact` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `resolved_at` datetime DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `resolution_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `deleted_at` datetime DEFAULT NULL,
  `deleted_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_maintenance_updated_by` (`updated_by`),
  KEY `fk_maintenance_deleted_by` (`deleted_by`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_location_type` (`location_type`),
  KEY `idx_room_number` (`room_number`),
  KEY `idx_assigned_to` (`assigned_to`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_report_date` (`report_date`),
  KEY `idx_is_deleted` (`is_deleted`),
  KEY `idx_status_priority` (`status`,`priority`),
  KEY `idx_deleted_status` (`is_deleted`,`status`),
  KEY `idx_location_room` (`location_type`,`room_number`),
  CONSTRAINT `fk_maintenance_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_maintenance_deleted_by` FOREIGN KEY (`deleted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_maintenance_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reportes de mantenimiento del hotel';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversation_id` int NOT NULL,
  `sender_id` char(36) NOT NULL COMMENT 'Usuario que envio el mensaje',
  `content` text NOT NULL COMMENT 'Contenido del mensaje',
  `notify` tinyint(1) DEFAULT '0' COMMENT 'Genera notificacion urgente',
  `is_edited` tinyint(1) DEFAULT '0' COMMENT 'Fue editado',
  `edited_at` timestamp NULL DEFAULT NULL COMMENT 'Cuando se edito',
  `deleted_at` timestamp NULL DEFAULT NULL COMMENT 'Soft delete',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_conversation` (`conversation_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_deleted_at` (`deleted_at`),
  KEY `idx_conv_created` (`conversation_id`,`created_at`),
  FULLTEXT KEY `ft_content` (`content`),
  CONSTRAINT `fk_msg_conv` FOREIGN KEY (`conversation_id`) REFERENCES `conversations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_msg_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Mensajes de conversaciones';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notification_recipients`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notification_recipients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notification_id` int NOT NULL,
  `user_id` char(36) NOT NULL,
  `is_read` tinyint(1) DEFAULT '0' COMMENT 'Si este usuario leyó la notificación',
  `read_at` datetime DEFAULT NULL COMMENT 'Cuándo la leyó',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_notification_user` (`notification_id`,`user_id`),
  KEY `idx_notification_id` (`notification_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_is_read` (`is_read`),
  CONSTRAINT `notification_recipients_ibfk_1` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `notification_recipients_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Destinatarios de notificaciones (múltiples usuarios por notificación)';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` enum('groups','parking','logbooks','system','messages') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'groups' COMMENT 'Módulo de origen',
  `group_id` int DEFAULT NULL COMMENT 'ID del grupo (NULL si no es de grupos)',
  `related_to` enum('payment','rooming','balance','contract','arrival','general','message') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de notificacion',
  `related_id` int DEFAULT NULL COMMENT 'ID del elemento relacionado (payment_id, etc.)',
  `direct_link` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'URL directa al recurso (ej: /dashboard/groups/5?tab=payments)',
  `title` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Título de la notificación',
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Descripción completa',
  `priority` enum('low','medium','high','urgent') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'medium' COMMENT 'Prioridad de la notificación',
  `status` enum('pending','sent','read') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'pending' COMMENT 'Estado de la notificación',
  `scheduled_for` datetime DEFAULT NULL COMMENT 'Cuándo debe enviarse (notificaciones programadas)',
  `sent_at` datetime DEFAULT NULL COMMENT 'Cuándo se envió (in-app)',
  `email_sent` tinyint(1) DEFAULT '0' COMMENT 'Si se envió por email',
  `email_sent_at` datetime DEFAULT NULL COMMENT 'Cuándo se envió el email',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_module` (`module`),
  KEY `idx_group_id` (`group_id`),
  KEY `idx_status` (`status`),
  KEY `idx_priority` (`priority`),
  KEY `idx_scheduled_for` (`scheduled_for`),
  KEY `idx_related_to` (`related_to`),
  CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `hotel_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Notificaciones (in-app + email) - Multi-módulo';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parking_availability`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_availability` (
  `id` int NOT NULL AUTO_INCREMENT,
  `spot_id` int NOT NULL,
  `date` date NOT NULL,
  `is_available` tinyint(1) DEFAULT '1',
  `booking_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_spot_date` (`spot_id`,`date`),
  KEY `booking_id` (`booking_id`),
  KEY `idx_date` (`date`),
  KEY `idx_available` (`is_available`),
  KEY `idx_spot_date` (`spot_id`,`date`),
  CONSTRAINT `parking_availability_ibfk_1` FOREIGN KEY (`spot_id`) REFERENCES `parking_spots` (`id`) ON DELETE CASCADE,
  CONSTRAINT `parking_availability_ibfk_2` FOREIGN KEY (`booking_id`) REFERENCES `parking_bookings` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parking_bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_bookings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `booking_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `spot_id` int NOT NULL,
  `vehicle_id` int DEFAULT NULL,
  `operator_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `expected_checkin` datetime NOT NULL,
  `expected_checkout` datetime NOT NULL,
  `actual_checkin` datetime DEFAULT NULL,
  `actual_checkout` datetime DEFAULT NULL,
  `status` enum('reserved','checked_in','completed','canceled','no_show') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'reserved',
  `total_amount` decimal(10,2) DEFAULT NULL,
  `payment_amount` decimal(10,2) DEFAULT NULL,
  `payment_method` enum('cash','card','transfer','agency') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `payment_reference` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `payment_date` timestamp NULL DEFAULT NULL,
  `booking_source` enum('direct','booking_com','expedia','airbnb','agency_other') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'direct',
  `external_booking_id` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `updated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_booking_code` (`booking_code`),
  KEY `fk_booking_vehicle` (`vehicle_id`),
  KEY `idx_booking_search` (`spot_id`,`status`,`expected_checkin`,`expected_checkout`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`expected_checkin`,`expected_checkout`),
  KEY `idx_operator` (`operator_id`),
  KEY `idx_booking_source` (`booking_source`),
  KEY `idx_booking_code` (`booking_code`),
  KEY `idx_created_by` (`created_by`),
  KEY `idx_updated_by` (`updated_by`),
  CONSTRAINT `fk_booking_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_booking_operator` FOREIGN KEY (`operator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_booking_spot` FOREIGN KEY (`spot_id`) REFERENCES `parking_spots` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_booking_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_booking_vehicle` FOREIGN KEY (`vehicle_id`) REFERENCES `parking_vehicles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reservas con integridad flexible: spot RESTRICT, vehicle/operator SET NULL para preservar historial';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_validate_booking_insert` BEFORE INSERT ON `parking_bookings` FOR EACH ROW BEGIN
    DECLARE v_unavailable_count INT;
    
    SELECT COUNT(*) INTO v_unavailable_count
    FROM parking_availability
    WHERE spot_id = NEW.spot_id
    AND date >= DATE(NEW.expected_checkin)
    AND date < DATE(NEW.expected_checkout)
    AND is_available = FALSE;
    
    IF v_unavailable_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La plaza no está disponible en las fechas seleccionadas';
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_generate_booking_code` BEFORE INSERT ON `parking_bookings` FOR EACH ROW BEGIN
    DECLARE next_number INT;
    DECLARE date_part VARCHAR(8);

    
    SET date_part = DATE_FORMAT(
        COALESCE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'Europe/Madrid'), UTC_TIMESTAMP()),
        '%Y%m%d'
    );

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(booking_code, -4) AS UNSIGNED)
    ), 0) + 1
    INTO next_number
    FROM parking_bookings
    WHERE booking_code LIKE CONCAT('PK-', date_part, '-%');

    SET NEW.booking_code = CONCAT(
        'PK-',
        date_part,
        '-',
        LPAD(next_number, 4, '0')
    );
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_update_availability_on_booking` AFTER INSERT ON `parking_bookings` FOR EACH ROW BEGIN
    IF NEW.status IN ('reserved', 'checked_in') THEN
        UPDATE parking_availability
        SET is_available = FALSE, 
            booking_id = NEW.id
        WHERE spot_id = NEW.spot_id
        AND date >= DATE(NEW.expected_checkin) 
        AND date < DATE(NEW.expected_checkout);
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_free_availability_on_status_change` AFTER UPDATE ON `parking_bookings` FOR EACH ROW BEGIN
    IF OLD.status IN ('reserved', 'checked_in')
    AND NEW.status IN ('completed', 'canceled', 'no_show') THEN
        UPDATE parking_availability
        SET is_available = TRUE,
            booking_id = NULL
        WHERE spot_id = NEW.spot_id
        AND date >= DATE(OLD.expected_checkin)
        AND date < DATE(OLD.expected_checkout)
        AND booking_id = OLD.id;
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_update_availability_on_date_change` AFTER UPDATE ON `parking_bookings` FOR EACH ROW BEGIN
    IF (OLD.expected_checkin != NEW.expected_checkin
        OR OLD.expected_checkout != NEW.expected_checkout
        OR OLD.spot_id != NEW.spot_id)
    AND NEW.status IN ('reserved', 'checked_in') THEN

        
        UPDATE parking_availability
        SET is_available = TRUE,
            booking_id = NULL
        WHERE spot_id = OLD.spot_id
        AND date >= DATE(OLD.expected_checkin)
        AND date < DATE(OLD.expected_checkout)
        AND booking_id = OLD.id;

        
        UPDATE parking_availability
        SET is_available = FALSE,
            booking_id = NEW.id
        WHERE spot_id = NEW.spot_id
        AND date >= DATE(NEW.expected_checkin)
        AND date < DATE(NEW.expected_checkout)
        AND (booking_id IS NULL OR booking_id = NEW.id);
    END IF;
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
DROP TABLE IF EXISTS `parking_spots`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_spots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `level_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `spot_number` int NOT NULL,
  `spot_type` enum('normal','ancha','mas_ancha','esquina','accesible','estrecha_bicis') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT 'normal',
  `is_active` tinyint(1) DEFAULT '1',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_spot` (`level_code`,`spot_number`),
  KEY `idx_level` (`level_code`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `parking_vehicles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parking_vehicles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `plate_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `owner_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `model` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `plate_number` (`plate_number`),
  KEY `idx_plate` (`plate_number`),
  KEY `idx_owner` (`owner_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `payment_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_methods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL COMMENT 'Nombre del método de pago',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month_id` int NOT NULL COMMENT 'ID del planning mensual',
  `day_id` int NOT NULL COMMENT 'ID del día',
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado',
  `shift_code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Código del turno asignado',
  `source_constraint_id` int DEFAULT NULL COMMENT 'Constraint origen (si la celda está precargada/bloqueada)',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas de la asignación',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `libre_number` int DEFAULT NULL COMMENT 'Par de libre semanal al que pertenece esta asignación (1-45)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_day_employee` (`day_id`,`employee_id`),
  KEY `idx_month_id` (`month_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_shift_code` (`shift_code`),
  KEY `idx_source_constraint_id` (`source_constraint_id`),
  CONSTRAINT `fk_sched_assign_day` FOREIGN KEY (`day_id`) REFERENCES `scheduling_days` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_assign_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_assign_month` FOREIGN KEY (`month_id`) REFERENCES `scheduling_months` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_assign_shift` FOREIGN KEY (`shift_code`) REFERENCES `scheduling_shifts` (`code`) ON DELETE RESTRICT,
  CONSTRAINT `fk_sched_assign_source_constraint` FOREIGN KEY (`source_constraint_id`) REFERENCES `scheduling_constraints` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Asignación de turnos por empleado y día';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Clave de configuración',
  `config_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Valor de la configuración',
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Descripción de la configuración',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Configuración del sistema de horarios';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_constraints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_constraints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month_id` int NOT NULL COMMENT 'ID del planning mensual',
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado',
  `constraint_type` enum('vacation','sick_leave','sick_day','training','holiday','request_off','request_shift','request_no_shift') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de restricción',
  `start_date` date NOT NULL COMMENT 'Fecha inicio',
  `end_date` date NOT NULL COMMENT 'Fecha fin',
  `shift_code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Turno específico (para request_shift/request_no_shift)',
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending' COMMENT 'Estado de la petición',
  `priority` int NOT NULL DEFAULT '5' COMMENT 'Prioridad (1=máxima, 7=mínima)',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Motivo o notas',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó',
  `approved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que aprobó/rechazó',
  `approved_at` datetime DEFAULT NULL COMMENT 'Fecha de aprobación/rechazo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_month_id` (`month_id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_constraint_type` (`constraint_type`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`),
  KEY `idx_end_date` (`end_date`),
  KEY `idx_priority` (`priority`),
  KEY `fk_sched_const_shift` (`shift_code`),
  KEY `fk_sched_const_created_by` (`created_by`),
  KEY `fk_sched_const_approved_by` (`approved_by`),
  CONSTRAINT `fk_sched_const_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_const_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_const_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_const_month` FOREIGN KEY (`month_id`) REFERENCES `scheduling_months` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sched_const_shift` FOREIGN KEY (`shift_code`) REFERENCES `scheduling_shifts` (`code`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Restricciones y peticiones de empleados';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_days`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_days` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month_id` int NOT NULL COMMENT 'ID del planning mensual',
  `day_number` int NOT NULL COMMENT 'Día del mes (1-31)',
  `date` date NOT NULL COMMENT 'Fecha completa',
  `day_of_week` char(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Día semana (L,M,X,J,V,S,D)',
  `week_number` int NOT NULL COMMENT 'Número de semana del mes (1-5)',
  `is_holiday` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1=festivo, 0=normal',
  `holiday_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Nombre del festivo',
  `occupancy_pct` decimal(5,2) DEFAULT NULL COMMENT 'Porcentaje ocupación hotel',
  `arrivals` int DEFAULT NULL COMMENT 'Llegadas previstas',
  `departures` int DEFAULT NULL COMMENT 'Salidas previstas',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas del día',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_month_day` (`month_id`,`day_number`),
  KEY `idx_date` (`date`),
  KEY `idx_day_of_week` (`day_of_week`),
  KEY `idx_week_number` (`week_number`),
  KEY `idx_is_holiday` (`is_holiday`),
  CONSTRAINT `fk_sched_day_month` FOREIGN KEY (`month_id`) REFERENCES `scheduling_months` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Días del planning con información adicional';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_employee_contracts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_employee_contracts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
  `year` int NOT NULL COMMENT 'Año del contrato',
  `dias_trabajo` int NOT NULL DEFAULT '225' COMMENT 'Días de trabajo anuales según convenio',
  `horas_anuales` int NOT NULL DEFAULT '1800' COMMENT 'Horas a trabajar anuales (dias_trabajo * 8)',
  `dias_vacaciones` int NOT NULL DEFAULT '30' COMMENT 'Días de vacaciones anuales',
  `dias_libre_semanal` int NOT NULL DEFAULT '90' COMMENT 'Días de libre semanal anuales (~2 por semana)',
  `dias_bonificables` int NOT NULL DEFAULT '20' COMMENT 'Días bonificables/festivos anuales',
  `dias_it` int NOT NULL DEFAULT '0' COMMENT 'Días de IT previstos (normalmente 0)',
  `dias_laborables_ano` int NOT NULL DEFAULT '365' COMMENT 'Total días laborables del año',
  `observaciones` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Observaciones especiales del convenio',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_employee_year` (`employee_id`,`year`),
  KEY `idx_year` (`year`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `fk_sched_contract_created_by` (`created_by`),
  CONSTRAINT `fk_sched_contract_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_contract_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Datos de convenio/contrato por empleado y año';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_employee_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_employee_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
  `date_from` date NOT NULL COMMENT 'Fecha inicio de la petición',
  `date_to` date NOT NULL COMMENT 'Fecha fin de la petición',
  `request_type` enum('shift_preference','shift_exclusion','bonificable','baja_temporal','vacation') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de petición',
  `requested_value` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Código turno (L,M,T,N,PI,P,...) cuando aplica',
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'pending',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `approved_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_employee_date` (`employee_id`,`date_from`,`date_to`),
  KEY `idx_status` (`status`),
  KEY `idx_request_type` (`request_type`),
  KEY `fk_sched_req_created_by` (`created_by`),
  KEY `fk_sched_req_approved_by` (`approved_by`),
  CONSTRAINT `fk_sched_req_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_req_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_req_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Peticiones de empleados';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_employee_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_employee_rules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
  `rule_type` enum('shift_priority','max_shift_per_month','min_shift_per_month','fixed_days','fixed_shift','no_weekends','custom') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de regla',
  `rule_value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Valor de la regla',
  `priority` int NOT NULL DEFAULT '0' COMMENT 'Prioridad de la regla (mayor = más importante)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1=activa, 0=inactiva',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas sobre la regla',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_rule_type` (`rule_type`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_sched_rule_employee` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Reglas específicas por empleado';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_employees` (
  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'ID del empleado (users.id)',
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de alta en scheduling',
  `added_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que lo añadió',
  `notes` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Notas',
  `display_order` int DEFAULT NULL COMMENT 'Manual sort order in scheduling UIs. NULL = unsorted, fallback to username.',
  `start_date` date DEFAULT NULL COMMENT 'Fecha de alta efectiva en horarios. NULL = siempre activo.',
  `end_date` date DEFAULT NULL COMMENT 'Fecha de baja en horarios. NULL = sin baja.',
  PRIMARY KEY (`employee_id`),
  KEY `idx_added_at` (`added_at`),
  KEY `fk_sched_emp_added_by` (`added_by`),
  KEY `idx_scheduling_employees_display_order` (`display_order`),
  CONSTRAINT `fk_sched_emp_added_by` FOREIGN KEY (`added_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_emp_user` FOREIGN KEY (`employee_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Empleados que participan en horarios';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month_id` int NOT NULL COMMENT 'ID del planning mensual',
  `action` enum('created','published','unpublished','assignment_changed','constraint_added','constraint_approved','constraint_rejected','manual_edit','reset') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Tipo de acción realizada',
  `table_affected` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Tabla afectada',
  `record_id` int DEFAULT NULL COMMENT 'ID del registro afectado',
  `field_changed` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Campo modificado',
  `old_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Valor anterior',
  `new_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Valor nuevo',
  `changed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que hizo el cambio',
  `changed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas del cambio',
  PRIMARY KEY (`id`),
  KEY `idx_month_id` (`month_id`),
  KEY `idx_action` (`action`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_changed_by` (`changed_by`),
  CONSTRAINT `fk_sched_hist_changed_by` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_hist_month` FOREIGN KEY (`month_id`) REFERENCES `scheduling_months` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de cambios para auditoría';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_months`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_months` (
  `id` int NOT NULL AUTO_INCREMENT,
  `year` int NOT NULL COMMENT 'Año del planning',
  `month` int NOT NULL COMMENT 'Mes del planning (1-12)',
  `status` enum('draft','published') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'draft' COMMENT 'Estado del planning: draft (en edición), published (publicado)',
  `published_at` datetime DEFAULT NULL COMMENT 'Fecha/hora de publicación',
  `published_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que publicó',
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci COMMENT 'Notas del planning',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL COMMENT 'Usuario que creó',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_year_month` (`year`,`month`),
  KEY `idx_status` (`status`),
  KEY `idx_year` (`year`),
  KEY `idx_month` (`month`),
  KEY `fk_sched_month_published_by` (`published_by`),
  KEY `fk_sched_month_created_by` (`created_by`),
  CONSTRAINT `fk_sched_month_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_sched_month_published_by` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Planning mensual';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_shifts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_shifts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Código del turno (M, T, N, etc.)',
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT 'Nombre del turno',
  `start_time` time DEFAULT NULL COMMENT 'Hora de inicio (NULL para ausencias)',
  `end_time` time DEFAULT NULL COMMENT 'Hora de fin (NULL para ausencias)',
  `hours` decimal(4,2) NOT NULL DEFAULT '8.00' COMMENT 'Horas del turno',
  `color` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT '#CCCCCC' COMMENT 'Color HEX para UI',
  `is_work_shift` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1=turno trabajo, 0=ausencia/libre',
  `is_paid` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1=pagado, 0=no pagado',
  `display_order` int NOT NULL DEFAULT '0' COMMENT 'Orden de visualización',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '1=activo, 0=inactivo',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shift_code` (`code`),
  KEY `idx_is_work_shift` (`is_work_shift`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_display_order` (`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Tipos de turno disponibles';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scheduling_solver_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scheduling_solver_runs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `month_id` int NOT NULL,
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `generated_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `status` enum('ok','infeasible','error') CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `solve_time_ms` int DEFAULT NULL,
  `cp_status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `soft_penalty` int DEFAULT NULL,
  `soft_penalty_breakdown` json DEFAULT NULL,
  `solver_input` json DEFAULT NULL,
  `solver_matrix` json DEFAULT NULL,
  `conflicting_constraints` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_month_id` (`month_id`),
  KEY `idx_status` (`status`),
  KEY `idx_generated_at` (`generated_at`),
  KEY `fk_solver_run_generated_by` (`generated_by`),
  CONSTRAINT `fk_solver_run_generated_by` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_solver_run_month` FOREIGN KEY (`month_id`) REFERENCES `scheduling_months` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='Historial de ejecuciones del solver CP-SAT por mes';
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `role_id` int NOT NULL DEFAULT '1',
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `is_demo` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'Public demo account: restricted by demoRestriction',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `avatar_url` varchar(500) DEFAULT NULL,
  `avatar_public_id` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_user_role` (`role_id`),
  CONSTRAINT `fk_user_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `v_bo_invoices_detail`;
/*!50001 DROP VIEW IF EXISTS `v_bo_invoices_detail`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_bo_invoices_detail` AS SELECT 
 1 AS `id`,
 1 AS `invoice_number`,
 1 AS `supplier_id`,
 1 AS `supplier_name`,
 1 AS `category_id`,
 1 AS `cost_center`,
 1 AS `department`,
 1 AS `category_full`,
 1 AS `amount_without_vat`,
 1 AS `amount_with_vat`,
 1 AS `vat_percentage`,
 1 AS `invoice_date`,
 1 AS `received_date`,
 1 AS `billing_period_start`,
 1 AS `billing_period_end`,
 1 AS `due_date`,
 1 AS `paid_date`,
 1 AS `status`,
 1 AS `payment_method`,
 1 AS `original_pdf_url`,
 1 AS `validated_pdf_url`,
 1 AS `validated_by`,
 1 AS `validated_by_name`,
 1 AS `validated_at`,
 1 AS `validation_notes`,
 1 AS `notes`,
 1 AS `created_by`,
 1 AS `created_by_name`,
 1 AS `created_at`,
 1 AS `updated_at`,
 1 AS `is_deleted`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_bo_monthly_summary`;
/*!50001 DROP VIEW IF EXISTS `v_bo_monthly_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_bo_monthly_summary` AS SELECT 
 1 AS `year`,
 1 AS `month`,
 1 AS `period`,
 1 AS `total_invoices`,
 1 AS `pending_count`,
 1 AS `paid_count`,
 1 AS `total_without_vat`,
 1 AS `total_with_vat`,
 1 AS `pending_total`,
 1 AS `paid_total`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_bo_suppliers_stats`;
/*!50001 DROP VIEW IF EXISTS `v_bo_suppliers_stats`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_bo_suppliers_stats` AS SELECT 
 1 AS `id`,
 1 AS `name`,
 1 AS `cif`,
 1 AS `default_category_id`,
 1 AS `cost_center`,
 1 AS `department`,
 1 AS `category_full`,
 1 AS `periodicity`,
 1 AS `payment_method`,
 1 AS `bank_account`,
 1 AS `email`,
 1 AS `phone`,
 1 AS `address`,
 1 AS `notes`,
 1 AS `is_active`,
 1 AS `total_invoices`,
 1 AS `pending_invoices`,
 1 AS `paid_invoices`,
 1 AS `ytd_total`,
 1 AS `last_invoice_date`*/;
SET character_set_client = @saved_cs_client;
/*!50106 SET @save_time_zone= @@TIME_ZONE */ ;
/*!50106 DROP EVENT IF EXISTS `cleanup_old_messages` */;
DELIMITER ;;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;;
/*!50003 SET character_set_client  = utf8mb4 */ ;;
/*!50003 SET character_set_results = utf8mb4 */ ;;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;;
/*!50003 SET @saved_time_zone      = @@time_zone */ ;;
/*!50003 SET time_zone             = 'SYSTEM' */ ;;
/*!50106 CREATE*/ /*!50117 */ /*!50106 EVENT `cleanup_old_messages` ON SCHEDULE EVERY 1 DAY STARTS '2025-12-17 18:15:34' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
  DELETE FROM messages 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  
  DELETE FROM conversations 
  WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages);
END */ ;;
/*!50003 SET time_zone             = @saved_time_zone */ ;;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;;
/*!50003 SET character_set_client  = @saved_cs_client */ ;;
/*!50003 SET character_set_results = @saved_cs_results */ ;;
/*!50003 SET collation_connection  = @saved_col_connection */ ;;
DELIMITER ;
/*!50106 SET TIME_ZONE= @save_time_zone */ ;
/*!50003 DROP FUNCTION IF EXISTS `check_availability` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  FUNCTION "check_availability"(
    p_spot_id INT,
    p_date_from DATE,
    p_date_to DATE
) RETURNS tinyint(1)
    READS SQL DATA
BEGIN
    DECLARE v_unavailable INT;
    
    SELECT COUNT(*) INTO v_unavailable
    FROM parking_availability
    WHERE spot_id = p_spot_id
    AND date >= p_date_from
    AND date < p_date_to
    AND is_available = FALSE;
    
    RETURN IF(v_unavailable = 0, 1, 0);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP FUNCTION IF EXISTS `get_total_availability` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  FUNCTION "get_total_availability"(p_date DATE) RETURNS int
    READS SQL DATA
BEGIN
    DECLARE v_available INT;
    
    SELECT COUNT(*) INTO v_available
    FROM parking_availability
    WHERE date = p_date AND is_available = TRUE;
    
    RETURN IFNULL(v_available, 0);
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `daily_parking_maintenance` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE "daily_parking_maintenance"()
BEGIN
    DECLARE v_expired_bookings INT DEFAULT 0;
    
    START TRANSACTION;
    
    
    UPDATE parking_bookings
    SET status = 'no_show',
        updated_at = NOW()
    WHERE status = 'reserved'
    AND DATE(expected_checkin) < CURDATE()
    AND actual_checkin IS NULL;
    
    SET v_expired_bookings = ROW_COUNT();
    
    
    CALL sync_parking_availability();
    
    COMMIT;
    
    SELECT 
        v_expired_bookings AS reservas_expiradas,
        'Mantenimiento completado' AS mensaje;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `generate_availability` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE "generate_availability"()
BEGIN
    DECLARE v_spot_id INT;
    DECLARE v_date DATE;
    DECLARE v_end_date DATE;
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_total INT DEFAULT 0;
    
    DECLARE spot_cursor CURSOR FOR SELECT id FROM parking_spots;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    SET v_date = CURDATE();
    SET v_end_date = DATE_ADD(CURDATE(), INTERVAL 365 DAY);
    
    OPEN spot_cursor;
    spot_loop: LOOP
        FETCH spot_cursor INTO v_spot_id;
        IF done THEN LEAVE spot_loop; END IF;
        
        SET v_date = CURDATE();
        WHILE v_date <= v_end_date DO
            INSERT IGNORE INTO parking_availability (spot_id, date, is_available)
            VALUES (v_spot_id, v_date, TRUE);
            SET v_total = v_total + 1;
            SET v_date = DATE_ADD(v_date, INTERVAL 1 DAY);
        END WHILE;
    END LOOP;
    CLOSE spot_cursor;
    
    SELECT CONCAT('Generados ', v_total, ' registros de disponibilidad') AS resultado;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `get_pending_checkins` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE "get_pending_checkins"(IN p_date DATE)
BEGIN
    SELECT 
        b.id AS booking_id,
        b.booking_code,
        ps.spot_number,
        ps.level_code AS planta,
        v.owner_name AS cliente,
        v.plate_number AS matricula,
        b.expected_checkin AS entrada_esperada,
        b.expected_checkout AS salida_esperada,
        DATEDIFF(b.expected_checkout, b.expected_checkin) AS dias,
        b.total_amount AS precio,
        b.booking_source AS agencia,
        b.external_booking_id AS codigo_externo,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM parking_bookings b2 
                WHERE b2.spot_id = b.spot_id 
                AND b2.status = 'checked_in'
                AND DATE(b2.actual_checkin) <= p_date
                AND (b2.actual_checkout IS NULL OR DATE(b2.actual_checkout) >= p_date)
            ) THEN 1
            ELSE 0
        END AS plaza_ocupada
    FROM parking_bookings b
    INNER JOIN parking_spots ps ON b.spot_id = ps.id
    LEFT JOIN parking_vehicles v ON b.vehicle_id = v.id
    WHERE b.status = 'reserved'
    AND DATE(b.expected_checkin) = p_date
    ORDER BY b.expected_checkin;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 DROP PROCEDURE IF EXISTS `sync_parking_availability` */;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_0900_ai_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'REAL_AS_FLOAT,PIPES_AS_CONCAT,ANSI_QUOTES,IGNORE_SPACE,ONLY_FULL_GROUP_BY,ANSI,STRICT_ALL_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
CREATE  PROCEDURE "sync_parking_availability"()
BEGIN
    DECLARE affected_rows INT DEFAULT 0;
    DECLARE start_time TIMESTAMP DEFAULT NOW();
    
    START TRANSACTION;
    
    
    UPDATE parking_availability 
    SET is_available = 1, booking_id = NULL
    WHERE date >= CURDATE();
    
    SET affected_rows = ROW_COUNT();
    
    
    UPDATE parking_availability pa
    INNER JOIN parking_bookings pb ON pa.spot_id = pb.spot_id
        AND pa.date >= DATE(pb.expected_checkin)
        AND pa.date < DATE(pb.expected_checkout)
        AND pb.status IN ('reserved', 'checked_in')
    SET pa.is_available = 0, pa.booking_id = pb.id;
    
    SET affected_rows = affected_rows + ROW_COUNT();
    
    COMMIT;
    
    
    SELECT 
        affected_rows AS registros_actualizados,
        TIMESTAMPDIFF(MICROSECOND, start_time, NOW()) AS tiempo_microsegundos,
        'Sincronización completada' AS mensaje;
END ;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50001 DROP VIEW IF EXISTS `v_bo_invoices_detail`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `v_bo_invoices_detail` AS select `i`.`id` AS `id`,`i`.`invoice_number` AS `invoice_number`,`i`.`supplier_id` AS `supplier_id`,`s`.`name` AS `supplier_name`,`i`.`category_id` AS `category_id`,`c`.`cost_center` AS `cost_center`,`c`.`department` AS `department`,concat(`c`.`cost_center`,' / ',`c`.`department`) AS `category_full`,`i`.`amount_without_vat` AS `amount_without_vat`,`i`.`amount_with_vat` AS `amount_with_vat`,`i`.`vat_percentage` AS `vat_percentage`,`i`.`invoice_date` AS `invoice_date`,`i`.`received_date` AS `received_date`,`i`.`billing_period_start` AS `billing_period_start`,`i`.`billing_period_end` AS `billing_period_end`,`i`.`due_date` AS `due_date`,`i`.`paid_date` AS `paid_date`,`i`.`status` AS `status`,`i`.`payment_method` AS `payment_method`,`i`.`original_pdf_url` AS `original_pdf_url`,`i`.`validated_pdf_url` AS `validated_pdf_url`,`i`.`validated_by` AS `validated_by`,`u_val`.`username` AS `validated_by_name`,`i`.`validated_at` AS `validated_at`,`i`.`validation_notes` AS `validation_notes`,`i`.`notes` AS `notes`,`i`.`created_by` AS `created_by`,`u_cre`.`username` AS `created_by_name`,`i`.`created_at` AS `created_at`,`i`.`updated_at` AS `updated_at`,`i`.`is_deleted` AS `is_deleted` from ((((`bo_invoices` `i` left join `bo_suppliers` `s` on((`i`.`supplier_id` = `s`.`id`))) left join `bo_categories` `c` on((`i`.`category_id` = `c`.`id`))) left join `users` `u_val` on((`i`.`validated_by` = `u_val`.`id`))) left join `users` `u_cre` on((`i`.`created_by` = `u_cre`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_bo_monthly_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `v_bo_monthly_summary` AS select year(`i`.`invoice_date`) AS `year`,month(`i`.`invoice_date`) AS `month`,date_format(`i`.`invoice_date`,'%Y-%m') AS `period`,count(0) AS `total_invoices`,count((case when (`i`.`status` = 'pending') then 1 end)) AS `pending_count`,count((case when (`i`.`status` = 'paid') then 1 end)) AS `paid_count`,sum(`i`.`amount_without_vat`) AS `total_without_vat`,sum(`i`.`amount_with_vat`) AS `total_with_vat`,sum((case when (`i`.`status` = 'pending') then `i`.`amount_with_vat` else 0 end)) AS `pending_total`,sum((case when (`i`.`status` = 'paid') then `i`.`amount_with_vat` else 0 end)) AS `paid_total` from `bo_invoices` `i` where (`i`.`is_deleted` = 0) group by year(`i`.`invoice_date`),month(`i`.`invoice_date`),date_format(`i`.`invoice_date`,'%Y-%m') order by `year` desc,`month` desc */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_bo_suppliers_stats`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `v_bo_suppliers_stats` AS select `s`.`id` AS `id`,`s`.`name` AS `name`,`s`.`cif` AS `cif`,`s`.`default_category_id` AS `default_category_id`,`c`.`cost_center` AS `cost_center`,`c`.`department` AS `department`,concat(`c`.`cost_center`,' / ',`c`.`department`) AS `category_full`,`s`.`periodicity` AS `periodicity`,`s`.`payment_method` AS `payment_method`,`s`.`bank_account` AS `bank_account`,`s`.`email` AS `email`,`s`.`phone` AS `phone`,`s`.`address` AS `address`,`s`.`notes` AS `notes`,`s`.`is_active` AS `is_active`,count(distinct `i`.`id`) AS `total_invoices`,count(distinct (case when (`i`.`status` = 'pending') then `i`.`id` end)) AS `pending_invoices`,count(distinct (case when (`i`.`status` = 'paid') then `i`.`id` end)) AS `paid_invoices`,coalesce(sum((case when ((year(`i`.`invoice_date`) = year(curdate())) and (`i`.`is_deleted` = 0)) then `i`.`amount_with_vat` end)),0) AS `ytd_total`,max(`i`.`invoice_date`) AS `last_invoice_date` from ((`bo_suppliers` `s` left join `bo_categories` `c` on((`s`.`default_category_id` = `c`.`id`))) left join `bo_invoices` `i` on(((`s`.`id` = `i`.`supplier_id`) and (`i`.`is_deleted` = 0)))) group by `s`.`id` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

