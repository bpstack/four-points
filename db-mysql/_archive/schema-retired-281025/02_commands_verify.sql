-- Ver el estado actual de una plaza específica
SELECT 
  ps.spot_number,
  ps.level_code,
  pa.date,
  pa.is_available,
  pb.id AS booking_id,
  pb.status,
  pb.expected_checkin,
  pb.expected_checkout
FROM parking_spots ps
LEFT JOIN parking_availability pa ON ps.id = pa.spot_id 
  AND pa.date >= CURDATE() 
  AND pa.date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
LEFT JOIN parking_bookings pb ON pa.booking_id = pb.id
WHERE ps.id = 1  -- Cambia por el ID de una plaza que tenga reservas
ORDER BY pa.date;

-- Deberías ver:

-- Si hay una reserva reserved: is_available = 0 (FALSE)
-- Si hay un check-in checked_in: is_available = 0 (FALSE)
-- Si está libre o completed: is_available = 1 (TRUE)