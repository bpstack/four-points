-- =========================================================
-- MESSAGES MODULE - DATABASE SCHEMA
-- =========================================================
-- Descripción: Sistema de Mensajería Interna (DMs + Grupos)
-- Versión: AIVEN (utf8mb4_0900_ai_ci)
-- =========================================================

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversations;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABLA 1: conversations
-- =========================================================
CREATE TABLE conversations (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  type            ENUM('dm', 'group') NOT NULL DEFAULT 'dm' COMMENT 'Tipo: dm=directo, group=grupo',
  name            VARCHAR(100) NULL COMMENT 'Nombre del grupo (NULL para DMs)',
  created_by      CHAR(36) NOT NULL COMMENT 'Usuario que creó la conversación',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_type (type),
  INDEX idx_created_by (created_by),
  INDEX idx_updated_at (updated_at),
  
  CONSTRAINT fk_conv_creator 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- TABLA 2: conversation_participants
-- =========================================================
CREATE TABLE conversation_participants (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  user_id           CHAR(36) NOT NULL,
  joined_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at      TIMESTAMP NULL COMMENT 'Último momento de lectura',
  is_admin          TINYINT(1) DEFAULT 0,
  is_active         TINYINT(1) DEFAULT 1,
  
  UNIQUE KEY unique_participant (conversation_id, user_id),
  INDEX idx_user_id (user_id),
  INDEX idx_conversation_id (conversation_id),
  INDEX idx_user_active (user_id, is_active),
  
  CONSTRAINT fk_part_conv 
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  CONSTRAINT fk_part_user 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- TABLA 3: messages
-- =========================================================
CREATE TABLE messages (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id   INT NOT NULL,
  sender_id         CHAR(36) NOT NULL,
  content           TEXT NOT NULL,
  notify            TINYINT(1) DEFAULT 0 COMMENT 'Genera notificación urgente',
  is_edited         TINYINT(1) DEFAULT 0,
  edited_at         TIMESTAMP NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- =========================================================
-- EVENTO: Limpieza de mensajes antiguos (90 días)
-- =========================================================
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

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
SELECT '✅ Tablas de mensajería creadas (AIVEN)' AS resultado;
SHOW TABLES LIKE 'conversation%';
SHOW TABLES LIKE 'messages';
