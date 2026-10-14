-- =============================================================================
-- 20261014_booking_code_hotel_date.sql
-- =============================================================================
-- trg_generate_booking_code took the date of PK-YYYYMMDD-NNNN from NOW(), which
-- is UTC on Aiven and in every session (ADR-047): a booking made between 00:00
-- and 02:00 in Madrid got yesterday's code. It now converts UTC_TIMESTAMP()
-- (UTC whatever the session zone) to Madrid.
-- Where MySQL has no named time zones loaded (a local install), CONVERT_TZ
-- gives NULL and the code falls back to the UTC date, as before.
-- Only the date changes; the numbering is the same.
--
-- Idempotent: DROP TRIGGER IF EXISTS + CREATE.
--
-- Applies to: LOCAL + AIVEN. The code works with either version.
-- Rollback: recreate it with DATE_FORMAT(NOW(), '%Y%m%d')
--   (aiven/05_parking_functions_triggers.sql).
-- =============================================================================

DROP TRIGGER IF EXISTS trg_generate_booking_code;

DELIMITER $$

CREATE TRIGGER trg_generate_booking_code
BEFORE INSERT ON parking_bookings
FOR EACH ROW
BEGIN
    DECLARE next_number INT;
    DECLARE date_part VARCHAR(8);

    -- Formato: PK-YYYYMMDD-0001, con la fecha de Madrid
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
END$$

DELIMITER ;

SELECT DATE_FORMAT(COALESCE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', 'Europe/Madrid'), UTC_TIMESTAMP()), '%Y%m%d')
  AS booking_code_date_now;
