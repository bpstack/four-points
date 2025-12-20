-- =========================================================
-- NOTIFICATIONS MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de notificaciones multi-módulo
-- Versión: LOCAL (utf8mb4_unicode_ci)
-- Dependencias: users, hotel_groups (opcional)
-- =========================================================

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS notification_recipients;
DROP TABLE IF EXISTS notifications;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA 1: notifications
-- Notificaciones (in-app + email) - Multi-módulo
-- =========================================================
CREATE TABLE `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `module` enum('groups','parking','logbooks','system','messages') COLLATE utf8mb4_unicode_ci DEFAULT 'groups' COMMENT 'Módulo de origen',
  `group_id` int DEFAULT NULL COMMENT 'ID del grupo (NULL si no es de grupos)',
  `related_to` enum('payment','rooming','balance','contract','arrival','general','message') COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Tipo de notificación',
  `related_id` int DEFAULT NULL COMMENT 'ID del elemento relacionado (payment_id, etc.)',
  `direct_link` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'URL directa al recurso',
  `title` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Título de la notificación',
  `message` text COLLATE utf8mb4_unicode_ci COMMENT 'Descripción completa',
  `priority` enum('low','medium','high','urgent') COLLATE utf8mb4_unicode_ci DEFAULT 'medium' COMMENT 'Prioridad',
  `status` enum('pending','sent','read') COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Estado',
  `scheduled_for` datetime DEFAULT NULL COMMENT 'Cuándo debe enviarse',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Notificaciones (in-app + email) - Multi-módulo';

-- =========================================================
-- TABLA 2: notification_recipients
-- Destinatarios de notificaciones
-- =========================================================
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Destinatarios de notificaciones';

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ Tablas de notificaciones creadas (LOCAL)' AS resultado;
SHOW TABLES LIKE 'notification%';
