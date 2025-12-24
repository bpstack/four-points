-- Script para limpiar datos de scheduling
-- Ejecutar en orden por las foreign keys

-- 1. Borrar asignaciones
DELETE FROM scheduling_assignments;

-- 2. Borrar historial
DELETE FROM scheduling_history;

-- 3. Borrar restricciones
DELETE FROM scheduling_constraints;

-- 4. Borrar días
DELETE FROM scheduling_days;

-- 5. Borrar meses
DELETE FROM scheduling_months;

-- 6. Resetear auto_increment
ALTER TABLE scheduling_assignments AUTO_INCREMENT = 1;
ALTER TABLE scheduling_history AUTO_INCREMENT = 1;
ALTER TABLE scheduling_constraints AUTO_INCREMENT = 1;
ALTER TABLE scheduling_days AUTO_INCREMENT = 1;
ALTER TABLE scheduling_months AUTO_INCREMENT = 1;

SELECT 'Datos de scheduling borrados' AS resultado;
