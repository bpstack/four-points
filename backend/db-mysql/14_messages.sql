-- =========================================================
-- 14_messages.sql
-- Sistema de Mensajeria Interna (DMs + Grupos)
-- =========================================================
-- Descripcion: Sistema de mensajes entre usuarios
-- Autor: stackBP
-- Fecha: 2025
-- Base de datos: hotel_db
-- =========================================================

USE hotel_db;

-- =========================================================
-- SAFETY: Drop tables en orden inverso (respetando FK)
-- =========================================================
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;

SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- MODIFICAR ENUM DE NOTIFICACIONES (añadir 'message')
-- =========================================================
-- Nota: MySQL no permite ALTER ENUM directamente, hay que recrear la columna
-- Primero verificamos si ya tiene 'message' en el enum

-- Para LOCAL (utf8mb4_unicode_ci):
ALTER TABLE notifications 
MODIFY COLUMN related_to ENUM('payment','rooming','balance','contract','arrival','general','message') 
COLLATE utf8mb4_unicode_ci NOT NULL 
COMMENT 'Tipo de notificacion';

-- =========================================================
-- TABLA 1: conversations
-- Conversaciones (DMs y Grupos)
-- =========================================================
CREATE TABLE conversations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  type            ENUM('dm', 'group') NOT NULL DEFAULT 'dm' COMMENT 'Tipo: dm=directo, group=grupo',
  name            VARCHAR(100) NULL COMMENT 'Nombre del grupo (NULL para DMs)',
  created_by      CHAR(36) NOT NULL COMMENT 'Usuario que creo la conversacion',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  INDEX idx_updated_at (updated_at),
  
  CONSTRAINT fk_conv_creator 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Conversaciones de mensajeria (DMs y grupos)';

-- =========================================================
-- TABLA 2: conversation_participants
-- Participantes de cada conversacion
-- =========================================================
CREATE TABLE conversation_participants (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  user_id           CHAR(36) NOT NULL,
  joined_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Cuando se unio',
  last_read_at      TIMESTAMP NULL COMMENT 'Ultimo momento de lectura (mensajes anteriores = leidos)',
  is_admin          TINYINT(1) DEFAULT 0 COMMENT 'Es admin del grupo (puede gestionar participantes)',
  is_active         TINYINT(1) DEFAULT 1 COMMENT 'Sigue activo en la conversacion',
  
  UNIQUE KEY unique_participant (conversation_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_user_active (user_id, is_active),
  
  CONSTRAINT fk_part_conv 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_part_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Participantes de conversaciones';

-- =========================================================
-- TABLA 3: messages
-- Mensajes de las conversaciones
-- =========================================================
CREATE TABLE messages (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  sender_id         CHAR(36) NOT NULL COMMENT 'Usuario que envio el mensaje',
  content           TEXT NOT NULL COMMENT 'Contenido del mensaje',
  notify            TINYINT(1) DEFAULT 0 COMMENT 'Genera notificacion urgente (remitente decide)',
  is_edited         TINYINT(1) DEFAULT 0 COMMENT 'Fue editado',
  edited_at         TIMESTAMP NULL COMMENT 'Cuando se edito',
  deleted_at        TIMESTAMP NULL COMMENT 'Soft delete (NULL = activo)',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_conv_created (conversation_id, created_at),
  FULLTEXT INDEX ft_content (content) COMMENT 'Para busqueda de texto',
  
  CONSTRAINT fk_msg_conv 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci 
COMMENT='Mensajes de conversaciones';

-- =========================================================
-- EVENTO DE LIMPIEZA (90 dias)
-- Ejecuta diariamente para borrar mensajes antiguos
-- =========================================================
-- Nota: Requiere que event_scheduler este habilitado:
-- SET GLOBAL event_scheduler = ON;

DELIMITER //

DROP EVENT IF EXISTS cleanup_old_messages//

CREATE EVENT cleanup_old_messages
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
BEGIN
  -- Borrar mensajes > 90 dias (soft delete primero, luego hard delete)
  DELETE FROM messages 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  
  -- Borrar conversaciones sin mensajes
  DELETE FROM conversations 
  WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages);
END//

DELIMITER ;

-- =========================================================
-- VERIFICACION
-- =========================================================
SELECT 'Tablas de mensajeria creadas correctamente (LOCAL)' AS resultado;

SHOW TABLES LIKE 'conversation%';
SHOW TABLES LIKE 'messages';

-- Verificar que el enum se actualizo
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'hotel_db' 
  AND TABLE_NAME = 'notifications' 
  AND COLUMN_NAME = 'related_to';


-- =========================================================
-- =========================================================
-- SECCION AIVEN (utf8mb4_0900_ai_ci)
-- Ejecutar solo en Aiven, comentar la seccion LOCAL arriba
-- =========================================================
-- =========================================================

/*
-- PARA AIVEN: Descomentar esta seccion y comentar la de arriba

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
SET FOREIGN_KEY_CHECKS = 1;

-- Modificar enum de notificaciones para Aiven
ALTER TABLE notifications 
MODIFY COLUMN related_to ENUM('payment','rooming','balance','contract','arrival','general','message') 
COLLATE utf8mb4_0900_ai_ci NOT NULL 
COMMENT 'Tipo de notificacion';

-- TABLA 1: conversations (Aiven)
CREATE TABLE conversations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  type            ENUM('dm', 'group') NOT NULL DEFAULT 'dm' COMMENT 'Tipo: dm=directo, group=grupo',
  name            VARCHAR(100) NULL COMMENT 'Nombre del grupo (NULL para DMs)',
  created_by      CHAR(36) NOT NULL COMMENT 'Usuario que creo la conversacion',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  INDEX idx_updated_at (updated_at),
  
  CONSTRAINT fk_conv_creator 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Conversaciones de mensajeria (DMs y grupos)';

-- TABLA 2: conversation_participants (Aiven)
CREATE TABLE conversation_participants (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  user_id           CHAR(36) NOT NULL,
  joined_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Cuando se unio',
  last_read_at      TIMESTAMP NULL COMMENT 'Ultimo momento de lectura',
  is_admin          TINYINT(1) DEFAULT 0 COMMENT 'Es admin del grupo',
  is_active         TINYINT(1) DEFAULT 1 COMMENT 'Sigue activo en la conversacion',
  
  UNIQUE KEY unique_participant (conversation_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_user_active (user_id, is_active),
  
  CONSTRAINT fk_part_conv 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_part_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Participantes de conversaciones';

-- TABLA 3: messages (Aiven)
CREATE TABLE messages (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  sender_id         CHAR(36) NOT NULL COMMENT 'Usuario que envio el mensaje',
  content           TEXT NOT NULL COMMENT 'Contenido del mensaje',
  notify            TINYINT(1) DEFAULT 0 COMMENT 'Genera notificacion urgente',
  is_edited         TINYINT(1) DEFAULT 0 COMMENT 'Fue editado',
  edited_at         TIMESTAMP NULL COMMENT 'Cuando se edito',
  deleted_at        TIMESTAMP NULL COMMENT 'Soft delete',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_conversation (conversation_id),
  INDEX idx_sender (sender_id),
  INDEX idx_created_at (created_at),
  INDEX idx_deleted_at (deleted_at),
  INDEX idx_conv_created (conversation_id, created_at),
  FULLTEXT INDEX ft_content (content),
  
  CONSTRAINT fk_msg_conv 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_msg_sender 
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Mensajes de conversaciones';

-- Evento de limpieza (Aiven)
DELIMITER //
DROP EVENT IF EXISTS cleanup_old_messages//
CREATE EVENT cleanup_old_messages
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP + INTERVAL 1 HOUR
DO
BEGIN
  DELETE FROM messages 
  WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
  
  DELETE FROM conversations 
  WHERE id NOT IN (SELECT DISTINCT conversation_id FROM messages);
END//
DELIMITER ;

SELECT 'Tablas de mensajeria creadas correctamente (AIVEN)' AS resultado;

*/
