-- -----------------------------------------------------------------
-- 1️ TRIGGERS – CONTROL DE RECUERDO Y RESERVAS
-- -----------------------------------------------------------------
DELIMITER $$

-- 1.1  Evita la sobreposición de sesiones en la misma plaza
CREATE TRIGGER trg_check_spot_availability
BEFORE INSERT ON parking_sessions
FOR EACH ROW
BEGIN
  IF EXISTS (
    SELECT 1
    FROM parking_sessions ps
    WHERE ps.spot_id = NEW.spot_id
      AND ps.status IN ('reserved','occupied','completed')
      AND (
          (NEW.check_in BETWEEN ps.check_in AND IFNULL(ps.check_out,'9999-12-31 23:59:59'))
        OR  (NEW.check_out BETWEEN ps.check_in AND IFNULL(ps.check_out,'9999-12-31 23:59:59'))
        OR  (ps.check_in BETWEEN NEW.check_in AND NEW.check_out)
      )
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El espacio ya está reservado en ese intervalo de tiempo.';
  END IF;
END$$

-- 1.2  Evita la superposición de reservas externas y futuras
CREATE TRIGGER trg_check_reservation_availability
BEFORE INSERT ON parking_reservations
FOR EACH ROW
BEGIN
  -- 1.1  Reserva con otras reservas activas
  IF EXISTS (
    SELECT 1
    FROM parking_reservations r
    WHERE r.spot_id = NEW.spot_id
      AND r.status IN ('reserved','pending','occupied')
      AND (
          (NEW.expected_in  BETWEEN r.expected_in  AND r.expected_out)
        OR  (NEW.expected_out BETWEEN r.expected_in  AND r.expected_out)
        OR  (r.expected_in  BETWEEN NEW.expected_in  AND NEW.expected_out)
      )
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La plaza ya está reservada en ese intervalo.';
  END IF;

  -- 1.2  Reserva con sesiones ya creadas (futuras o presentes)
  IF EXISTS (
    SELECT 1
    FROM parking_sessions s
    WHERE s.spot_id = NEW.spot_id
      AND s.status IN ('reserved','occupied','completed')
      AND (
          (NEW.expected_in  BETWEEN s.check_in  AND IFNULL(s.check_out,
              CAST('9999-12-31 23:59:59' AS DATETIME)))
        OR (NEW.expected_out BETWEEN s.check_in  AND IFNULL(s.check_out,
              CAST('9999-12-31 23:59:59' AS DATETIME)))
        OR (s.check_in       BETWEEN NEW.expected_in AND NEW.expected_out)
      )
  ) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La plaza está reservada/ocupada en ese intervalo.';
  END IF;
END$$

DELIMITER ;