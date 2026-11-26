-- =============================================================================
-- catalogs.sql: filas de los catálogos que necesita una instalación nueva
-- Generado con scripts/snapshot-schema.sh: no se edita a mano.
-- Salen de una instalación del repositorio, nunca de producción.
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

INSERT  IGNORE INTO `roles` (`id`, `name`) VALUES (2,'admin');
INSERT  IGNORE INTO `roles` (`id`, `name`) VALUES (6,'group-admin');
INSERT  IGNORE INTO `roles` (`id`, `name`) VALUES (3,'mantenimiento');
INSERT  IGNORE INTO `roles` (`id`, `name`) VALUES (1,'recepcionista');

INSERT  IGNORE INTO `payment_methods` (`id`, `name`, `is_active`, `created_at`) VALUES (1,'TARJETA CRÉDITO O DÉBITO',1,'2026-11-26 13:48:06');
INSERT  IGNORE INTO `payment_methods` (`id`, `name`, `is_active`, `created_at`) VALUES (2,'BACS',1,'2026-11-26 13:48:06');
INSERT  IGNORE INTO `payment_methods` (`id`, `name`, `is_active`, `created_at`) VALUES (3,'WEB PAYMENT',1,'2026-11-26 13:48:06');
INSERT  IGNORE INTO `payment_methods` (`id`, `name`, `is_active`, `created_at`) VALUES (4,'TRANSFERENCIA',1,'2026-11-26 13:48:06');
INSERT  IGNORE INTO `payment_methods` (`id`, `name`, `is_active`, `created_at`) VALUES (5,'OTROS',1,'2026-11-26 13:48:06');

INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (1,'-2',1,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (2,'-2',2,'ancha',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (3,'-2',3,'mas_ancha',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (4,'-2',4,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (5,'-2',5,'esquina',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (6,'-2',6,'accesible',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (7,'-2',7,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (8,'-2',8,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (9,'-2',9,'estrecha_bicis',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (10,'-2',10,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (11,'-3',1,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (12,'-3',2,'ancha',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (13,'-3',3,'mas_ancha',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (14,'-3',4,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (15,'-3',5,'esquina',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (16,'-3',6,'accesible',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (17,'-3',7,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (18,'-3',8,'normal',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (19,'-3',9,'estrecha_bicis',1,NULL);
INSERT  IGNORE INTO `parking_spots` (`id`, `level_code`, `spot_number`, `spot_type`, `is_active`, `notes`) VALUES (20,'-3',10,'normal',1,NULL);

INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21110','Breakfast Buffet Included','breakfast',1);
INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21111','Lunch Food','lunch',4);
INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21112','Dinner Food','dinner',6);
INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21120','Breakfast Directo FB','breakfast',3);
INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21124','Breakfast Buffet Excluded','breakfast',2);
INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21267','Lunch Beverage','lunch',5);
INSERT  IGNORE INTO `fnb_category` (`code`, `name`, `group_type`, `display_order`) VALUES ('21307','Dinner Beverage','dinner',7);

INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (1,'GASTOS ADMINISTRACIÓN','ADMINISTRACIÓN',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (2,'GASTOS ADMINISTRACIÓN','FEES MARCA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (3,'GASTOS ADMINISTRACIÓN','PRL',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (4,'MANTENIMIENTO','REPARACIONES Y MATERIALES',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (5,'MANTENIMIENTO','INSTALACIONES',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (6,'MANTENIMIENTO','PERSONAL SUBCONTRATADO',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (7,'ALOJAMIENTO','COMISIÓN AGENCIA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (8,'ALOJAMIENTO','LAVANDERÍA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (9,'ALOJAMIENTO','PRODUCTOS LIMPIEZA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (10,'ALOJAMIENTO','AMENITIES',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (11,'ALOJAMIENTO','MATERIALES HABITACIONES',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (12,'ALOJAMIENTO','LIMPIEZA SUBCONTRATADA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (13,'SUMINISTROS','ELECTRICIDAD',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (14,'SUMINISTROS','AGUA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (15,'SUMINISTROS','GAS',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (16,'SUMINISTROS','TELÉFONO',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (17,'MARKETING Y RESERVAS','MARKETING Y RESERVAS',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (18,'MARKETING Y RESERVAS','PUBLICIDAD',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (19,'CONSUMO RESTAURACIÓN','COMIDA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (20,'CONSUMO RESTAURACIÓN','BEBIDAS',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (21,'INFORMÁTICA','INFORMÁTICA',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (22,'RECURSOS HUMANOS','PERSONAL',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `bo_categories` (`id`, `cost_center`, `department`, `description`, `is_active`, `created_at`, `updated_at`) VALUES (23,'RECURSOS HUMANOS','FORMACIÓN',NULL,1,'2026-11-26 13:48:07','2026-11-26 13:48:07');

INSERT  IGNORE INTO `checklist_config` (`hotel_id`, `daily_reset_time`, `timezone`, `updated_at`) VALUES (1,'06:30:00','Europe/Madrid','2026-11-26 13:48:08');

INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (1,'M','Mañana','07:00:00','15:00:00',8.00,'#D1FAE5',1,1,1,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (2,'T','Tarde','15:00:00','23:00:00',8.00,'#DBEAFE',1,1,2,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (3,'N','Noche','23:00:00','07:00:00',8.00,'#FFEDD5',1,1,3,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (4,'P','Presencia','08:00:00','16:00:00',8.00,'#E0E7FF',1,1,4,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (5,'PI','Personal Intervención','09:00:00','17:00:00',8.00,'#FEF3C7',1,1,5,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (6,'B','Abonable/Festivo',NULL,NULL,0.00,'#F3E8FF',0,1,6,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (7,'V','Vacaciones',NULL,NULL,0.00,'#FECACA',0,1,7,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (8,'L','Libre',NULL,NULL,0.00,'#FFFFFF',0,1,8,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (9,'FO','Formación',NULL,NULL,0.00,'#FEF9C3',0,1,9,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (10,'IT','Incapacidad Temporal',NULL,NULL,0.00,'#FED7AA',0,1,10,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (11,'E','Enfermedad',NULL,NULL,0.00,'#FECDD3',0,1,11,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (12,'A','Ausencia Injustificada',NULL,NULL,0.00,'#FCA5A5',0,0,12,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');
INSERT  IGNORE INTO `scheduling_shifts` (`id`, `code`, `name`, `start_time`, `end_time`, `hours`, `color`, `is_work_shift`, `is_paid`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES (13,'LI','Libre Disposición',NULL,NULL,0.00,'#E5E7EB',0,1,13,1,'2026-11-26 13:48:08','2026-11-26 13:48:08');

INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (1,'min_morning_staff','1','Mínimo personas en turno mañana','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (2,'pref_morning_staff','2','Preferido personas en turno mañana','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (3,'max_morning_staff','2','Máximo personas en turno mañana','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (4,'min_afternoon_staff','1','Mínimo personas en turno tarde','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (5,'pref_afternoon_staff','2','Preferido personas en turno tarde','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (6,'max_afternoon_staff','2','Máximo personas en turno tarde','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (7,'min_night_staff','1','Mínimo personas en turno noche','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (8,'max_night_staff','1','Máximo personas en turno noche','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (9,'max_weekly_shifts','6','Máximo turnos por semana','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (10,'pref_weekly_shifts','5','Preferido turnos por semana','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (11,'min_rest_hours','48','Horas mínimas de descanso','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (12,'min_night_block','4','Mínimo noches consecutivas por mes','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (13,'max_night_block','6','Máximo noches consecutivas por mes','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (14,'pref_night_block','5','Preferido noches consecutivas por mes','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (15,'min_monthly_libre','8','Mínimo días libres al mes','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (16,'max_monthly_libre','12','Máximo días libres al mes','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (17,'max_consecutive_work_days','6','Máximo días consecutivos de trabajo','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (18,'min_consecutive_libre','2','Mínimo días libres consecutivos por semana','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (19,'annual_vacation_days','30','Días de vacaciones anuales','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (20,'annual_holidays','14','Festivos anuales','2026-11-26 13:48:07','2026-11-26 13:48:07');
INSERT  IGNORE INTO `scheduling_config` (`id`, `config_key`, `config_value`, `description`, `created_at`, `updated_at`) VALUES (21,'annual_free_days','95','Libres semanales anuales','2026-11-26 13:48:07','2026-11-26 13:48:07');
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


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

INSERT  IGNORE INTO `users` (`id`, `username`, `email`, `password`, `role_id`, `created_at`, `is_active`, `is_demo`, `updated_at`, `avatar_url`, `avatar_public_id`) VALUES ('system-cron','system-cron','system-cron@localhost','!',1,'2026-11-26 13:48:08',0,0,'2026-11-26 13:48:08',NULL,NULL);
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

CALL generate_availability();
