# Operaciones Multi-Hotel

## 1. Añadir un Nuevo Hotel

### 1.1 Pasos para añadir hotel (Aiven)

```sql
USE hotel_db;

-- 1. Insertar nuevo hotel
INSERT INTO hoteles (nombre, slug, settings, timezone, moneda, idioma)
VALUES (
  'Hotel Ejemplo',
  'hotel-ejemplo',
  '{"parking": {"total_spaces": 100}}',
  'Europe/Madrid',
  'EUR',
  'es'
);

-- 2. Obtener el ID del nuevo hotel
SELECT LAST_INSERT_ID() AS hotel_id;

-- 3. Verificar inserción
SELECT * FROM hoteles WHERE slug = 'hotel-ejemplo';
```

### 1.2 Crear usuario admin para el hotel

```sql
-- Los usuarios se crean con hotel_id
INSERT INTO users (id, username, email, password, role_id, hotel_id)
VALUES (
  UUID(),  -- CHAR(36) UUID
  'admin_ejemplo',
  'admin@ejemplo.com',
  '$2b$10$...',  -- password hasheada
  2,  -- role_id para admin
  2  -- hotel_id del paso anterior
);

-- Verificar
SELECT id, username, email, hotel_id FROM users WHERE hotel_id = 2;
```

---

## 2. Configuración Inicial por Módulo

### 2.1 Parking

```sql
-- Configurar espacios de parking para el nuevo hotel
INSERT INTO parking_spots (level_code, spot_number, spot_type, hotel_id)
VALUES 
  ('S1', 1, 'normal', 2),
  ('S1', 2, 'normal', 2),
  ('S1', 3, 'accesible', 2),
  -- ... más espacios
  ('S2', 1, 'mas_ancha', 2);

-- Verificar
SELECT * FROM parking_spots WHERE hotel_id = 2;
```

### 2.2 Cashier

```sql
-- Los turnos de caja se crean automáticamente cuando se usan
-- Solo verificar que el usuario tiene acceso
SELECT * FROM cashier_shifts WHERE hotel_id = 2 LIMIT 5;
```

---

## 3. Gestión de Usuarios

### 3.1 Ver usuarios de un hotel

```sql
SELECT id, username, email, role_id, created_at
FROM users 
WHERE hotel_id = 2;

-- Con join a roles
SELECT u.id, u.username, u.email, r.name AS rol
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.hotel_id = 2;
```

### 3.2 Cambiar hotel a un usuario

```sql
-- Actualizar hotel_id del usuario
UPDATE users 
SET hotel_id = 3 
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Verificar
SELECT id, username, hotel_id FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### 3.3 Verificar acceso del usuario

```sql
-- Verificar que el usuario tiene hotel_id válido
SELECT 
  u.id,
  u.username,
  u.hotel_id,
  h.nombre AS hotel_nombre
FROM users u
LEFT JOIN hoteles h ON u.hotel_id = h.id
WHERE u.id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## 4. Monitoreo

### 4.1 Queries de verificación

```sql
-- Ver todos los hoteles
SELECT id, nombre, slug, activo FROM hoteles;

-- Ver usuarios por hotel
SELECT 
  h.nombre AS hotel,
  COUNT(u.id) AS usuarios
FROM hoteles h
LEFT JOIN users u ON u.hotel_id = h.id
GROUP BY h.id;

-- Ver registros por hotel (ejemplo logbooks)
SELECT 
  h.nombre AS hotel,
  COUNT(l.id) AS logbooks
FROM hoteles h
LEFT JOIN logbooks l ON l.hotel_id = h.id
GROUP BY h.id;

-- Ver espacios de parking por hotel
SELECT 
  h.nombre AS hotel,
  COUNT(ps.id) AS espacios
FROM hoteles h
LEFT JOIN parking_spots ps ON ps.hotel_id = h.id
GROUP BY h.id;
```

### 4.2 Verificar aislamiento de datos

```sql
-- Verificar que los datos están filtrados por hotel
SELECT 'Hotel 1' AS hotel, COUNT(*) AS total FROM logbooks WHERE hotel_id = 1
UNION ALL
SELECT 'Hotel 2' AS hotel, COUNT(*) AS total FROM logbooks WHERE hotel_id = 2
UNION ALL
SELECT 'Total' AS hotel, COUNT(*) AS total FROM logbooks;
```

---

## 5. Mantenimiento

### 5.1 Respaldo de datos de un hotel específico

```bash
# Backup filtrado por hotel (usando WHERE)
mysqldump -h aiven-host -u user -p hotel_db \
  --where="hotel_id=2" \
  logbooks parking_spots parking_bookings \
  > backup-hotel-2-$(date +%Y%m%d).sql
```

### 5.2 Verificar integridad de FK

```sql
-- Verificar que no hay registros huérfanos
SELECT 'logbooks' AS tabla, COUNT(*) AS huérfanos 
FROM logbooks l 
WHERE l.hotel_id IS NULL
UNION ALL
SELECT 'parking_spots', COUNT(*) FROM parking_spots ps WHERE ps.hotel_id IS NULL
UNION ALL
SELECT 'hotel_groups', COUNT(*) FROM hotel_groups hg WHERE hg.hotel_id IS NULL;

-- Si hay huérfanos, corregirlos
UPDATE logbooks SET hotel_id = 1 WHERE hotel_id IS NULL;
```

---

## 6. Troubleshooting

### 6.1 Problema: Usuario sin hotel

```sql
-- Verificar
SELECT id, username, hotel_id FROM users WHERE hotel_id IS NULL;

-- Solución: asignar al hotel 1
UPDATE users SET hotel_id = 1 WHERE hotel_id IS NULL;
```

### 6.2 Problema: Datos de otro hotel

```sql
-- Verificar aislamiento
SELECT COUNT(*) FROM logbooks WHERE hotel_id = 1;  -- Hotel actual
SELECT COUNT(*) FROM logbooks WHERE hotel_id = 2;  -- Otro hotel

-- Si hay datos incorrectos, mover al hotel correcto
UPDATE logbooks SET hotel_id = 1 
WHERE hotel_id IS NULL 
  OR hotel_id NOT IN (SELECT id FROM hoteles);
```

### 6.3 Problema: Sesión sin hotel

```bash
# Limpiar cookies de sesión
# El usuario debe hacer logout y login nuevamente

# Verificar que el usuario tiene hotel_id
SELECT id, username, hotel_id FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### 6.4 Problema: Error de FK

```sql
-- Verificar que el hotel existe
SELECT * FROM hoteles WHERE id = 999;

-- Si no existe, crear el hotel primero
INSERT INTO hoteles (id, nombre, slug) VALUES (999, 'Hotel Faltante', 'hotel-faltante');

-- Luego intentar la operación que falló
```

---

## 7. APIs de Gestión

### 7.1 Endpoints de hotel

```
GET    /api/hotels              # Listar hoteles (admin global)
GET    /api/hotels/:id          # Ver hotel específico
POST   /api/hotels              # Crear hotel (admin global)
PUT    /api/hotels/:id          # Actualizar hotel
DELETE /api/hotels/:id          # Desactivar hotel

GET    /api/hotels/:id/users    # Usuarios del hotel
```

### 7.2 Verificar hotel activo

```typescript
// En backend
const hotelId = req.hotelId;  // Del middleware

// En frontend
const { hotel } = useHotel();
console.log(hotel.id);  // Hotel activo
```

---

## 8. Métricas Operacionales

### 8.1 Dashboard de Hotels

```sql
-- Usuarios activos por hotel (últimos 7 días)
SELECT 
  h.nombre,
  COUNT(DISTINCT u.id) AS total_usuarios,
  COUNT(DISTINCT CASE WHEN u.updated_at > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN u.id END) AS activos_7d
FROM hoteles h
LEFT JOIN users u ON u.hotel_id = h.id
GROUP BY h.id;

-- Actividad por hotel (últimas 24h)
SELECT 
  h.nombre,
  COUNT(l.id) AS logbooks_24h
FROM hoteles h
LEFT JOIN logbooks l ON l.hotel_id = h.id AND l.created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY h.id;

-- Parking por hotel
SELECT 
  h.nombre,
  COUNT(DISTINCT ps.id) AS espacios,
  COUNT(DISTINCT pb.id) AS reservas
FROM hoteles h
LEFT JOIN parking_spots ps ON ps.hotel_id = h.id
LEFT JOIN parking_bookings pb ON pb.hotel_id = h.id AND pb.created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY h.id;
```

---

## 9. Seguridad

### 9.1 Verificar aislamiento

```sql
-- Como usuario sin acceso a todos los hotels
-- Debe devolver solo datos de su hotel

SELECT COUNT(*) FROM logbooks;  -- Debe ser solo su hotel
SELECT COUNT(*) FROM parking_spots;  -- Debe ser solo su hotel
```

### 9.2 Auditar cambios de hotel

```sql
-- Crear tabla de auditoría si no existe
CREATE TABLE IF NOT EXISTS hotel_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  usuario_id CHAR(36) NOT NULL,
  accion VARCHAR(50) NOT NULL,
  detalles JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_hotel (hotel_id),
  INDEX idx_usuario (usuario_id)
);
```

---

## 10. Configuración por Hotel

### 10.1 Variables en settings (JSON)

```sql
-- Ver settings de un hotel
SELECT nombre, settings FROM hoteles;

-- Actualizar settings
UPDATE hoteles 
SET settings = JSON_SET(
  settings,
  '$.parking.total_spaces',
  200,
  '$.scheduling.ai_enabled',
  true
)
WHERE id = 1;
```

### 10.2 Acceder a settings desde código

```typescript
// Backend
const settings = req.hotel?.settings || {};
const totalSpaces = settings.parking?.total_spaces || 50;

// Frontend
const { hotel } = useHotel();
const spaces = hotel?.settings?.parking?.total_spaces;
```

---

## 11. Comandos Rápidos

### 11.1 Ver todos los hoteles

```sql
SELECT id, nombre, slug, activo FROM hoteles ORDER BY id;
```

### 11.2 Ver conteo de registros por hotel

```sql
SELECT 
  h.nombre,
  (SELECT COUNT(*) FROM users WHERE hotel_id = h.id) AS users,
  (SELECT COUNT(*) FROM logbooks WHERE hotel_id = h.id) AS logbooks,
  (SELECT COUNT(*) FROM parking_spots WHERE hotel_id = h.id) AS parking_spots,
  (SELECT COUNT(*) FROM hotel_groups WHERE hotel_id = h.id) AS groups
FROM hoteles h
ORDER BY h.id;
```

### 11.3 Ver último acceso por hotel

```sql
SELECT 
  h.nombre,
  MAX(u.updated_at) AS ultimo_acceso
FROM hoteles h
LEFT JOIN users u ON u.hotel_id = h.id
GROUP BY h.id;
```
