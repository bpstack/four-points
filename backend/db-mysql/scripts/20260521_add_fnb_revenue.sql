-- ============================================================
-- 20260521_add_fnb_revenue.sql
--
-- Migración incremental — NO destructiva.
-- Añade las tablas del módulo F&B Revenue (Daily Revenue Breakfast/F&B)
-- al sistema de restaurante.
--
-- Idempotente: CREATE TABLE IF NOT EXISTS + INSERT IGNORE
-- ============================================================

CREATE TABLE IF NOT EXISTS fnb_category (
  code          VARCHAR(10)  NOT NULL,
  name          VARCHAR(100) NOT NULL,
  group_type    ENUM('breakfast','lunch','dinner') NOT NULL,
  display_order TINYINT      NOT NULL DEFAULT 0,
  PRIMARY KEY (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO fnb_category (code, name, group_type, display_order) VALUES
  ('21110', 'Breakfast Buffet Included', 'breakfast', 1),
  ('21124', 'Breakfast Buffet Excluded', 'breakfast', 2),
  ('21120', 'Breakfast Directo FB',      'breakfast', 3),
  ('21111', 'Lunch Food',               'lunch',     4),
  ('21267', 'Lunch Beverage',           'lunch',     5),
  ('21112', 'Dinner Food',              'dinner',    6),
  ('21307', 'Dinner Beverage',          'dinner',    7);

CREATE TABLE IF NOT EXISTS fnb_daily_revenue (
  id           INT           NOT NULL AUTO_INCREMENT,
  date         DATE          NOT NULL,
  category_code VARCHAR(10)  NOT NULL,
  amount       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  -- uk_date_code covers (date) and (date, category_code) queries as prefix.
  -- No standalone idx_date needed (would be redundant).
  UNIQUE KEY uk_date_code (date, category_code),
  CONSTRAINT fk_fnb_category FOREIGN KEY (category_code)
    REFERENCES fnb_category (code)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
