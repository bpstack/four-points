-- Fix: los triggers de parking_availability tocaban días de otras reservas.
-- - trg_free_availability_on_status_change liberaba todos los días del rango
--   de la reserva al completarla, cancelarla o marcarla no-show, aunque fueran
--   de otra reserva. Ahora solo libera los suyos (booking_id = OLD.id).
-- - trg_update_availability_on_date_change marcaba como suyos los días nuevos
--   aunque ya fueran de otra reserva. Ahora solo ocupa días libres o suyos.
-- La comprobación de solapes está en la aplicación (bookings.repository.ts,
-- _assertSpotFree); esto evita que el calendario se corrompa si algo la salta.
-- Idempotente: DROP TRIGGER IF EXISTS + CREATE.

DROP TRIGGER IF EXISTS trg_free_availability_on_status_change;
DROP TRIGGER IF EXISTS trg_update_availability_on_date_change;

DELIMITER $$

CREATE TRIGGER trg_free_availability_on_status_change
AFTER UPDATE ON parking_bookings
FOR EACH ROW
BEGIN
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
END$$

CREATE TRIGGER trg_update_availability_on_date_change
AFTER UPDATE ON parking_bookings
FOR EACH ROW
BEGIN
    IF (OLD.expected_checkin != NEW.expected_checkin
        OR OLD.expected_checkout != NEW.expected_checkout
        OR OLD.spot_id != NEW.spot_id)
    AND NEW.status IN ('reserved', 'checked_in') THEN

        -- Liberar fechas antiguas (solo las de esta reserva)
        UPDATE parking_availability
        SET is_available = TRUE,
            booking_id = NULL
        WHERE spot_id = OLD.spot_id
        AND date >= DATE(OLD.expected_checkin)
        AND date < DATE(OLD.expected_checkout)
        AND booking_id = OLD.id;

        -- Ocupar fechas nuevas (solo días libres o ya de esta reserva)
        UPDATE parking_availability
        SET is_available = FALSE,
            booking_id = NEW.id
        WHERE spot_id = NEW.spot_id
        AND date >= DATE(NEW.expected_checkin)
        AND date < DATE(NEW.expected_checkout)
        AND (booking_id IS NULL OR booking_id = NEW.id);
    END IF;
END$$

DELIMITER ;
