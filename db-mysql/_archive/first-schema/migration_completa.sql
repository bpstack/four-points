-- -----------------------------------------------------------------
-- 1️ BBDD: hotel_db
-- -----------------------------------------------------------------
DROP DATABASE IF EXISTS hotel_db;
CREATE DATABASE hotel_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_db;

-- -----------------------------------------------------------------
-- 2️ ESTRUCTURA PRINCIPAL
-- -----------------------------------------------------------------

-- 2.1  Roles
CREATE TABLE roles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2.2  Departamentos
CREATE TABLE departments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 2.3  Usuarios – UUID almacenado como texto ASCIIparking_spotsparking_spotslevel_idlevel_idlevel_id
CREATE TABLE users (
  id          CHAR(36) NOT NULL PRIMARY KEY,      -- <‑‑ sin charset‑especificado
  username    VARCHAR(255) NOT NULL UNIQUE,
  email       VARCHAR(255) NOT NULL,
  password    VARCHAR(255) NOT NULL,
  created_at  DATETIME   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_active   TINYINT(1) DEFAULT 1,
  updated_at  DATETIME   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2.4  Relación usuario‑rol (un solo rol por usuario)
CREATE TABLE user_role (
  user_id  CHAR(36) NOT NULL,
  role_id  INT     NOT NULL,
  PRIMARY KEY (user_id),
  CONSTRAINT fk_userrole_user   FOREIGN KEY (user_id)  REFERENCES users(id)     ON DELETE CASCADE,
  CONSTRAINT fk_userrole_role   FOREIGN KEY (role_id)  REFERENCES roles(id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- 3️ LOGBOOK
-- -----------------------------------------------------------------

-- 3.1  Tablita principal
CREATE TABLE logbooks (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  author_id         CHAR(36)     NULL,
  message           TEXT          NOT NULL,
  created_at        DATETIME      DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  importance_level  ENUM('baja','media','alta','urgente') DEFAULT 'media',
  department_id     INT          NULL,
  deleted_at        DATETIME     NULL,                     -- soft‑delete
  is_solved         TINYINT(1)   NOT NULL DEFAULT 0,
  solved_at         DATETIME     NULL,
  solved_by         CHAR(36)     NULL,
  CONSTRAINT fk_logbooks_author     FOREIGN KEY (author_id)   REFERENCES users(id)   ON DELETE SET NULL,
  CONSTRAINT fk_logbooks_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
  CONSTRAINT fk_logbooks_solved_by FOREIGN KEY (solved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_logbooks_deleted_at   ON logbooks( deleted_at );
CREATE INDEX idx_logbooks_solved_at   ON logbooks( solved_at );

-- 3.2  Comentarios del logbook
CREATE TABLE logbook_comments (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  logbook_id    INT     NOT NULL,
  user_id       CHAR(36) NULL,
  comment       TEXT    NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  department_id INT NULL,
  importance_level ENUM('baja','media','alta','urgente') NULL,
  deleted_at      DATETIME NULL,
  CONSTRAINT fk_comments_logbook   FOREIGN KEY (logbook_id) REFERENCES logbooks(id)  ON DELETE CASCADE,
  CONSTRAINT fk_comments_user     FOREIGN KEY (user_id)    REFERENCES users(id)     ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_logbook_comments_updated_at ON logbook_comments(updated_at);

-- 3.3  Quiénes han leído el logbook
CREATE TABLE logbook_reads (
  logbook_id   INT        NOT NULL,
  user_id      CHAR(36)   NOT NULL,
  read_at      DATETIME   DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (logbook_id, user_id),
  CONSTRAINT fk_reads_logbook  FOREIGN KEY (logbook_id) REFERENCES logbooks(id)   ON DELETE CASCADE,
  CONSTRAINT fk_reads_user     FOREIGN KEY (user_id)   REFERENCES users(id)    ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3.4  Historial de cambios
CREATE TABLE logbook_history (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  logbook_id     INT     NOT NULL,
  editor_id      CHAR(36) NULL,
  comment_id     INT     NULL,
  department_id  INT     NULL,
  type           ENUM('logbook','comment') NOT NULL,
  action         ENUM('create','update','delete','read','solve') NOT NULL,
  previous_content TEXT,
  new_content      TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_logbook   FOREIGN KEY (logbook_id) REFERENCES logbooks(id)          ON DELETE CASCADE,
  CONSTRAINT fk_history_user     FOREIGN KEY (editor_id)  REFERENCES users(id)           ON DELETE SET NULL,
  CONSTRAINT fk_history_comment  FOREIGN KEY (comment_id) REFERENCES logbook_comments(id)  ON DELETE SET NULL,
  CONSTRAINT fk_history_department FOREIGN KEY (department_id) REFERENCES departments(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- 4️ PARKING
-- -----------------------------------------------------------------

-- 4.1  Clientes (propietarios de vehículos)
CREATE TABLE customers (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  full_name   VARCHAR(255) NOT NULL,
  phone       VARCHAR(20)  NOT NULL,
  email       VARCHAR(255) NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  /* ---------- Relación con el operador --------------------- */
  operator_id CHAR(36) NULL,
  CONSTRAINT fk_operator
      FOREIGN KEY (operator_id) REFERENCES users(id)
      ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4.2  Niveles/Plantas de parking
CREATE TABLE parking_levels (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  level_code  VARCHAR(20) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 4.3  Tipos de plaza
CREATE TABLE parking_spot_types (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  type_name   VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255)
) ENGINE=InnoDB;

-- 4.4  Plazas físicas
CREATE TABLE parking_spots (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  level_id    INT NOT NULL,
  spot_number TINYINT NOT NULL,
  
  type_id     INT NOT NULL,
  description VARCHAR(255),

  UNIQUE KEY uq_spot_num_per_level (level_id, spot_number),
  CONSTRAINT fk_spot_level FOREIGN KEY (level_id)
      REFERENCES parking_levels(id)  ON DELETE CASCADE,
  CONSTRAINT fk_spot_type  FOREIGN KEY (type_id)
      REFERENCES parking_spot_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4.5  Vehículos
CREATE TABLE parking_vehicles (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  licence_plate VARCHAR(12) NOT NULL UNIQUE,
  vehicle_type  VARCHAR(40),
  owner_id      INT NOT NULL,
  operator_id   CHAR(36) NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_vehicle_owner   FOREIGN KEY (owner_id)   REFERENCES customers(id)   ON DELETE RESTRICT,
  CONSTRAINT fk_vehicle_operator FOREIGN KEY (operator_id) REFERENCES users(id)      ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4.6  Sesiones de parking
CREATE TABLE parking_sessions (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  spot_id     INT NOT NULL,
  vehicle_id  INT NOT NULL,
  operator_id    CHAR(36) NULL,
  check_in    DATETIME NOT NULL,
  check_out   DATETIME NULL,
  status      ENUM('reserved','occupied','completed','canceled') DEFAULT 'reserved',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_spot     FOREIGN KEY (spot_id)   REFERENCES parking_spots(id)    ON DELETE CASCADE,
  CONSTRAINT fk_session_vehicle  FOREIGN KEY (vehicle_id) REFERENCES parking_vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_operator    FOREIGN KEY (operator_id)   REFERENCES users(id)          ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4.7  Reservas (exclusivas y externas)
CREATE TABLE parking_reservations (
  id                 INT PRIMARY KEY AUTO_INCREMENT,
  session_id         INT NULL,
  spot_id            INT NOT NULL,
  vehicle_id         INT NOT NULL,
  operator_id           CHAR(36) NULL,
  agency_id          INT DEFAULT NULL,
  external_booking_id VARCHAR(64) NULL,
  expected_in        DATETIME NOT NULL,
  expected_out       DATETIME NOT NULL,
  status             ENUM('pending','reserved','occupied','completed','canceled') DEFAULT 'pending',
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_session FOREIGN KEY (session_id) REFERENCES parking_sessions(id)   ON DELETE SET NULL,
  CONSTRAINT fk_reservation_spot   FOREIGN KEY (spot_id)    REFERENCES parking_spots(id)     ON DELETE CASCADE,
  CONSTRAINT fk_reservation_vehicle FOREIGN KEY (vehicle_id) REFERENCES parking_vehicles(id) ON DELETE CASCADE,
  CONSTRAINT fk_reservation_operator   FOREIGN KEY (operator_id)  REFERENCES users(id)          ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4.8  Tarifas de parking
CREATE TABLE parking_rates (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  duration_days   INT NOT NULL,
  price           DECIMAL(6,2) NOT NULL,
  description     VARCHAR(100)
) ENGINE=InnoDB;

-- 4.9  Facturas
CREATE TABLE parking_invoices (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  session_id   INT NOT NULL,
  issued_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  number       VARCHAR(20) NOT NULL UNIQUE,
  is_generated TINYINT(1) DEFAULT 1,
  CONSTRAINT fk_invoice_session FOREIGN KEY (session_id) REFERENCES parking_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4.10  Pagos
CREATE TABLE parking_payments (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  session_id  INT NOT NULL,
  amount      DECIMAL(7,2) NOT NULL,
  method      ENUM('cash','credit_card') NOT NULL,
  paid_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invoice_id  INT NULL,
  CONSTRAINT fk_payment_session FOREIGN KEY (session_id) REFERENCES parking_sessions(id)   ON DELETE CASCADE,
  CONSTRAINT fk_payment_invoice FOREIGN KEY (invoice_id) REFERENCES parking_invoices(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------
-- 5️ Índices de rendimiento
-- -----------------------------------------------------------------
-- Logbooks
CREATE INDEX idx_logbooks_author  ON logbooks (author_id);
CREATE INDEX idx_logbooks_department ON logbooks (department_id);
CREATE INDEX idx_logbooks_created_at ON logbooks(created_at);

-- Logbook comments
CREATE INDEX idx_logbook_comments_user  ON logbook_comments (user_id);
CREATE INDEX idx_logbook_comments_logbook ON logbook_comments (logbook_id);

-- Parking – sesión a plaza
CREATE INDEX idx_session_spot_time ON parking_sessions (spot_id, check_in, check_out);

-- Parking – reserva a plaza
CREATE INDEX idx_reservation_spot_status ON parking_reservations (spot_id, status);
CREATE INDEX idx_reservations_spot_in_out ON parking_reservations(spot_id, expected_in, expected_out);

CREATE INDEX idx_parking_reservations_spot_id    ON parking_reservations(spot_id);
CREATE INDEX idx_parking_reservations_expected_in ON parking_reservations(expected_in);
CREATE INDEX idx_parking_reservations_expected_out ON parking_reservations(expected_out);
CREATE INDEX idx_parking_reservations_status     ON parking_reservations(status);

-- Parking – pagos por método
CREATE INDEX idx_payment_method ON parking_payments (method);

-- Parking – facturas por sesión
CREATE INDEX idx_invoice_session ON parking_invoices (session_id);
CREATE INDEX idx_invoices_issued_at ON parking_invoices(issued_at);


-- Parking – dueño de vehículo
CREATE INDEX idx_vehicle_owner ON parking_vehicles (owner_id);
CREATE INDEX idx_parking_vehicles_operator ON parking_vehicles(operator_id);

/* (Opcional) crear índice para buscar rápidamente los comentarios "activos") */
CREATE INDEX idx_logbook_comments_deleted_at ON logbook_comments (deleted_at);

-- INSERTS

INSERT INTO roles (name) VALUES
  ('recepcionist'),   -- <-- el valor por defecto que usa tu repo
  ('admin');
  
  INSERT INTO departments (name) VALUES
('pisos'),
('mantenimiento'),
('reservas'),
('parking'),
('clientes'),
('backoffice');

-- RESTRICCIÓN ÚNICA para evitar combinaciones de nivel y número de plazas

ALTER TABLE parking_spots
ADD CONSTRAINT unique_level_spot UNIQUE (level_id, spot_number);

-- Cuando introducimos una nueva consigna necesitamos el campo date:

ALTER TABLE logbooks
ADD COLUMN `date` DATE NULL;

DESCRIBE logbooks;
DESCRIBE departments;

UPDATE logbooks 
SET date = DATE(created_at) 
WHERE date IS NULL 
  AND id > 0;

-- Agregar un nuevo valor al ENUM: reopen para poder volver a poner un logbook de solved a pending.
ALTER TABLE logbook_history
MODIFY COLUMN action ENUM('create','update','delete','read','solve','reopen') NOT NULL;


-- -- Añadir 'unread' al ENUM de la columna action (para toggel frontend unread logbooks)

ALTER TABLE logbook_history 
MODIFY COLUMN action ENUM(
  'create', 
  'update', 
  'delete', 
  'read', 
  'unread',    -- ✅ AÑADIR este valor
  'solve', 
  'reopen'
) NOT NULL;


-- 4.11 Agencias (para reservas externas)
CREATE TABLE agencies (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(255) NOT NULL UNIQUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Insertar algunas agencias comunes
INSERT INTO agencies (name) VALUES
('Booking.com'),
('Airbnb'),
('Expedia'),
('Hotels.com'),
('Parking Partner');

-- Es necesario agregar la foreign key en la tabla parking_reservations. Ejecuta:

-- Agregar la foreign key que faltaba
ALTER TABLE parking_reservations
ADD CONSTRAINT fk_reservation_agency 
FOREIGN KEY (agency_id) REFERENCES agencies(id) 
ON DELETE SET NULL;
