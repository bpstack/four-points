/* -----------------------------------------------------------------
 * 04_seed_parking_structure.sql
 *  Inserta plantas (parking_levels), tipos de plaza
 *  (parking_spot_types) y 20 plazas (10 por nivel).
 * --------------------------------------------------------------- */

USE hotel_db;

-- ------------------------------------------------------------
-- 1️  Plantas (niveles) – ejemplo: -2 y -3
-- ------------------------------------------------------------
INSERT IGNORE INTO parking_levels (level_code)
VALUES ('-2'), ('-3');

-- Variables de nivel: @lvl1 = -2, @lvl2 = -3
SET @lvl1 = (SELECT id FROM parking_levels WHERE level_code = '-2');
SET @lvl2 = (SELECT id FROM parking_levels WHERE level_code = '-3');

-- ------------------------------------------------------------
-- 2️ Tipos de plaza – 6 tipos distintos
-- ------------------------------------------------------------
INSERT IGNORE INTO parking_spot_types (type_name, description)
VALUES
  ('Normal',        'Plaza estándar'),
  ('Ancha',         'Plaza amplia'),
  ('Más ancha',     'Plaza muy amplia'),
  ('Esquina fondo', 'Plaza en esquina al fondo'),
  ('Minusválidos',  'Plaza para personas con discapacidad'),
  ('Bicis/estrecha','Plaza para bicicletas u vehículos estrechos');

-- Variables de tipo para consulta más adelante
SET @type_normal        = (SELECT id FROM parking_spot_types WHERE type_name='Normal');
SET @type_ancha         = (SELECT id FROM parking_spot_types WHERE type_name='Ancha');
SET @type_mas_ancha     = (SELECT id FROM parking_spot_types WHERE type_name='Más ancha');
SET @type_esquina_fondo = (SELECT id FROM parking_spot_types WHERE type_name='Esquina fondo');
SET @type_minusvalidos  = (SELECT id FROM parking_spot_types WHERE type_name='Minusválidos');
SET @type_bicis         = (SELECT id FROM parking_spot_types WHERE type_name='Bicis/estrecha');

-- ------------------------------------------------------------
-- 3️  Tabla temporal con los números 1‑10 (para reusabilidad)
-- ------------------------------------------------------------
CREATE TEMPORARY TABLE IF NOT EXISTS tmp_nums (n INT);
TRUNCATE TABLE tmp_nums;
INSERT INTO tmp_nums VALUES (1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

-- ------------------------------------------------------------
-- 4  Inserta 10 plazas en la planta -2
-- ------------------------------------------------------------
INSERT INTO parking_spots (level_id, spot_number, type_id, description)
SELECT @lvl1 AS level_id,
      n     AS spot_number,
      CASE n
        WHEN 1 THEN @type_normal
        WHEN 2 THEN @type_ancha
        WHEN 3 THEN @type_mas_ancha
        WHEN 4 THEN @type_normal
        WHEN 5 THEN @type_esquina_fondo
        WHEN 6 THEN @type_minusvalidos
        WHEN 7 THEN @type_normal
        WHEN 8 THEN @type_normal
        WHEN 9 THEN @type_bicis
        WHEN 10 THEN @type_normal
      END AS type_id,
      NULL AS description
FROM tmp_nums;

-- ------------------------------------------------------------
-- 5️ Repite para la planta -3
-- ------------------------------------------------------------
INSERT INTO parking_spots (level_id, spot_number, type_id, description)
SELECT @lvl2 AS level_id,
      n     AS spot_number,
      CASE n
        WHEN 1 THEN @type_normal
        WHEN 2 THEN @type_ancha
        WHEN 3 THEN @type_mas_ancha
        WHEN 4 THEN @type_normal
        WHEN 5 THEN @type_esquina_fondo
        WHEN 6 THEN @type_minusvalidos
        WHEN 7 THEN @type_normal
        WHEN 8 THEN @type_normal
        WHEN 9 THEN @type_bicis
        WHEN 10 THEN @type_normal
      END AS type_id,
      NULL AS description
FROM tmp_nums;

-- ------------------------------------------------------------
-- 6️ Limpieza de la tabla temporal
-- ------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS tmp_nums;

-- ------------------------------------------------------------
-- 7️ Verificación rápida (no afecta a la base de datos)
-- ------------------------------------------------------------
SELECT * FROM parking_levels;
SELECT * FROM parking_spot_types;
SELECT * FROM parking_spots ORDER BY level_id, spot_number;
