-- =========================================================
-- 03_logbook_tables.sql (AIVEN)
-- Sistema de logbook (bitácora)
-- Collation: utf8mb4_0900_ai_ci (Aiven/MySQL 8.0)
-- =========================================================
USE hotel_db;

-- Tabla principal de logbooks
CREATE TABLE logbooks (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  author_id        CHAR(36) NULL,
  message          TEXT NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  importance_level ENUM('baja','media','alta','urgente') DEFAULT 'media',
  department_id    INT NULL,
  deleted_at       DATETIME NULL,
  is_solved        TINYINT(1) NOT NULL DEFAULT 0,
  solved_at        DATETIME NULL,
  solved_by        CHAR(36) NULL,
  date             DATE NULL,
  CONSTRAINT fk_logbooks_author     FOREIGN KEY (author_id)     REFERENCES users(id)       ON DELETE SET NULL,
  CONSTRAINT fk_logbooks_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_logbooks_solved_by  FOREIGN KEY (solved_by)     REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_logbooks_author     ON logbooks(author_id);
CREATE INDEX idx_logbooks_department ON logbooks(department_id);
CREATE INDEX idx_logbooks_created_at ON logbooks(created_at);
CREATE INDEX idx_logbooks_deleted_at ON logbooks(deleted_at);
CREATE INDEX idx_logbooks_solved_at  ON logbooks(solved_at);

-- Comentarios del logbook
CREATE TABLE logbook_comments (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  logbook_id       INT NOT NULL,
  user_id          CHAR(36) NULL,
  comment          TEXT NOT NULL,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  department_id    INT NULL,
  importance_level ENUM('baja','media','alta','urgente') NULL,
  deleted_at       DATETIME NULL,
  CONSTRAINT fk_comments_logbook FOREIGN KEY (logbook_id) REFERENCES logbooks(id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE INDEX idx_logbook_comments_user       ON logbook_comments(user_id);
CREATE INDEX idx_logbook_comments_logbook    ON logbook_comments(logbook_id);
CREATE INDEX idx_logbook_comments_updated_at ON logbook_comments(updated_at);
CREATE INDEX idx_logbook_comments_deleted_at ON logbook_comments(deleted_at);

-- Quiénes han leído el logbook
CREATE TABLE logbook_reads (
  logbook_id INT      NOT NULL,
  user_id    CHAR(36) NOT NULL,
  read_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (logbook_id, user_id),
  CONSTRAINT fk_reads_logbook FOREIGN KEY (logbook_id) REFERENCES logbooks(id) ON DELETE CASCADE,
  CONSTRAINT fk_reads_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Historial de cambios
CREATE TABLE logbook_history (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  logbook_id     INT NOT NULL,
  editor_id      CHAR(36) NULL,
  comment_id     INT NULL,
  department_id  INT NULL,
  type           ENUM('logbook','comment') NOT NULL,
  action         ENUM('create','update','delete','read','unread','solve','reopen') NOT NULL,
  previous_content TEXT,
  new_content      TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_logbook    FOREIGN KEY (logbook_id)    REFERENCES logbooks(id)          ON DELETE CASCADE,
  CONSTRAINT fk_history_user       FOREIGN KEY (editor_id)     REFERENCES users(id)             ON DELETE SET NULL,
  CONSTRAINT fk_history_comment    FOREIGN KEY (comment_id)    REFERENCES logbook_comments(id)  ON DELETE SET NULL,
  CONSTRAINT fk_history_department FOREIGN KEY (department_id) REFERENCES departments(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

SELECT 'Tablas logbook creadas: logbooks, logbook_comments, logbook_reads, logbook_history' AS resultado;
