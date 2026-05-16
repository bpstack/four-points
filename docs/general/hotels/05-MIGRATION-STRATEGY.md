# Estrategia de Migración

## 1. Enfoque: Migración Gradual

La migración debe realizarse de forma gradual para minimizar riesgos y permitir rollback en cada paso. No es necesario un "big bang" donde todo cambia simultáneamente.

### 1.1 Fases de Migración

```
Fase 1: Base de Datos (Pre-requisitos)
    │
    ▼
Fase 2: Backend Core (Middleware + Helpers)
    │
    ▼
Fase 3: Backend Modules (Repositories)
    │
    ▼
Fase 4: Frontend Core (Context + API)
    │
    ▼
Fase 5: Frontend Modules (Hooks + Components)
    │
    ▼
Fase 6: Testing y Rollout
```

### 1.2 Principio de Compatibilidad

Durante la migración:
- Código legacy sigue funcionando (backward compatible)
- Nuevas funcionalidades usan el nuevo sistema
- Tests en cada fase antes de continuar

---

## 2. Fase 1: Base de Datos (Aiven)

### 2.1 Pre-requisitos

1. **Backup completo** de la base de datos Aiven actual
2. **Instancia de desarrollo** Aiven para pruebas
3. **Script de rollback** preparado

### 2.2 Script de Migración DB

Ubicación: `backend/db-mysql/aiven/99_multi_hotel_migration.sql`

```sql
-- ============================================
-- MIGRACIÓN A ARQUITECTURA MULTI-HOTEL (Aiven)
-- IMPORTANTE: Usar COLLATE utf8mb4_0900_ai_ci
-- ============================================

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Crear tabla hoteles
CREATE TABLE IF NOT EXISTS hoteles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    settings JSON,
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    moneda VARCHAR(3) DEFAULT 'EUR',
    idioma VARCHAR(10) DEFAULT 'es',
    activo TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 2. Insertar hotel por defecto
INSERT INTO hoteles (id, nombre, slug, settings) VALUES 
(1, 'Four Points Hotel', 'four-points', '{"parking": {"total_spaces": 150}}')
ON DUPLICATE KEY UPDATE nombre = nombre;

-- 3. Añadir hotel_id a users
ALTER TABLE users
ADD COLUMN hotel_id INT UNSIGNED DEFAULT NULL,
ADD CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE SET NULL;

UPDATE users SET hotel_id = 1 WHERE hotel_id IS NULL;

ALTER TABLE users MODIFY hotel_id INT UNSIGNED NOT NULL DEFAULT 1;
CREATE INDEX idx_users_hotel ON users(hotel_id);

-- 4. Añadir hotel_id a tablas logbook
ALTER TABLE logbooks
ADD COLUMN hotel_id INT UNSIGNED NOT NULL DEFAULT 1,
ADD CONSTRAINT fk_logbooks_hotel FOREIGN KEY (hotel_id) REFERENCES hoteles(id) ON DELETE RESTRICT;

-- ... (continuar con otras tablas)

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Migración completada' AS resultado;
```

### 2.3 Validación

```sql
-- Verificar que no hay NULLs en hotel_id
SELECT COUNT(*) FROM users WHERE hotel_id IS NULL;
SELECT COUNT(*) FROM logbooks WHERE hotel_id IS NULL;
-- ... repetir para cada tabla

-- Verificar foreign keys
SELECT TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'hotel_db'
  AND REFERENCED_TABLE_NAME = 'hoteles';
```

### 2.4 Rollback

```sql
-- Script de rollback (aiven/99_multi_hotel_rollback.sql)

USE hotel_db;

SET FOREIGN_KEY_CHECKS = 0;

-- Eliminar FKs
ALTER TABLE users DROP FOREIGN KEY fk_users_hotel;
ALTER TABLE logbooks DROP FOREIGN KEY fk_logbooks_hotel;
-- ... eliminar otras FKs

-- Eliminar índices
ALTER TABLE users DROP INDEX idx_users_hotel;
-- ... eliminar otros índices

-- Eliminar columnas hotel_id
ALTER TABLE users DROP COLUMN hotel_id;
ALTER TABLE logbooks DROP COLUMN hotel_id;
-- ... eliminar de otras tablas

-- Eliminar tabla hoteles (opcional, si no hay datos importantes)
DROP TABLE IF EXISTS hoteles;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '✅ Rollback completado' AS resultado;
```

---

## 3. Fase 2: Backend Core

### 3.1 Pasos

1. **Crear modelo de Hotel**
   - `backend/models/hotel.ts`

2. **Crear middleware de hotel**
   - `backend/middlewares/hotel-middleware.ts`
   - Extraer hotel_id de sesión del usuario
   - Injectar en `req.hotelId`

3. **Crear helper de DB**
   - `backend/config/db-hotel.ts`
   - Clase `HotelDB` con métodos `query()`, `withHotel()`

4. **Integrar middleware**
   - `backend/index.ts`: Añadir después de auth middleware

### 3.2 Tests de Integración

```typescript
// backend/tests/hotel-middleware.test.ts

describe('Hotel Middleware', () => {
  it('should extract hotel_id from session user', async () => {
    const mockReq = {
      user: { id: '550e8400-e29b-41d4-a716-446655440000', hotel_id: 5 },
    } as any;

    const middleware = hotelMiddleware(mockReq, mockRes, () => {});

    expect(mockReq.hotelId).toBe(5);
  });

  it('should handle missing hotel', async () => {
    const mockReq = {
      user: { id: '550e8400-e29b-41d4-a716-446655440000' },
    } as any;

    await middleware(mockReq, mockRes, () => {});
    
    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
```

---

## 4. Fase 3: Backend Modules (Repositories)

### 4.1 Estrategia: Módulo por Módulo

Para cada módulo, seguir este proceso:

1. **Crear backup de repository original**
2. **Actualizar con hotel_id usando HotelDB helper**
3. **Probar endpoint manualmente**
4. **Si falla, hacer rollback al backup**

### 4.2 Orden Recomendado

| Orden | Módulo | Tablas | Prioridad |
|-------|--------|--------|-----------|
| 1 | Logbook | logbooks, logbook_comments, logbook_history | Alta |
| 2 | Parking | parking_spots, parking_vehicles, parking_bookings | Alta |
| 3 | Cashier | cashier_shifts, cashier_vouchers, cashier_history | Alta |
| 4 | Groups | hotel_groups, group_contacts, group_history | Media |
| 5 | Maintenance | maintenance_reports, maintenance_history | Media |
| 6 | Backoffice | bo_invoices, bo_suppliers, bo_assets | Media |
| 7 | Messages | conversations | Baja |
| 8 | Notifications | notifications | Baja |
| 9 | Blacklist | blacklist_entries | Baja |

### 4.3 Ejemplo: Logbook Repository

**ANTES** (`repositories/logbook/logbook-repository.ts`):

```typescript
export function getLogbooks() {
  return db.query('SELECT * FROM logbooks ORDER BY created_at DESC');
}
```

**DESPUÉS**:

```typescript
import { createHotelDB } from '../../config/db-hotel.js';
import { HotelAuthRequest } from '../../middlewares/hotel-middleware.js';

export async function getLogbooks(req: HotelAuthRequest, limit = 50, offset = 0) {
  const db = createHotelDB(req);
  const pool = getPool();

  const query = db.withHotel('SELECT * FROM logbooks');
  const queryWithLimit = `${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const [rows] = await pool.query(queryWithLimit, [limit, offset]);
  return rows;
}
```

### 4.4 Verificación Post-Migración

```bash
# Tests manuales con curl
curl -b cookies.txt http://localhost:4000/api/logbooks | jq '. | length'
# Debe devolver solo logbooks del hotel activo (hotel_id = 1 por defecto)
```

---

## 5. Fase 4: Frontend Core

### 5.1 Pasos

1. **Crear HotelContext**
   - `stores/hotel-context.tsx`
   - Provider con estado localStorage
   - Métodos: setHotel, switchHotel

2. **Actualizar API Client**
   - `lib/api-client.ts`
   - Añadir header `x-hotel-id`

3. **Crear Query Keys con hotelId**
   - `lib/query-keys.ts`
   - Incluir hotelId en todas las keys

4. **Integrar Provider**
   - `app/layout.tsx`

5. **Crear HotelSelector**
   - `components/hotel-selector.tsx`

### 5.2 Tests de Integración Frontend

```typescript
// frontend/__tests__/hotel-context.test.tsx

describe('HotelContext', () => {
  it('should store active hotel in localStorage', () => {
    const hotel = { id: 1, nombre: 'Four Points',-points' };

    slug: 'four render(
      <HotelProvider>
        <TestComponent />
      </HotelProvider>
    );

    act(() => {
      setHotel(hotel);
    });

    expect(localStorage.getItem('activeHotel')).toEqual(JSON.stringify(hotel));
  });
});
```

---

## 6. Fase 5: Frontend Modules

### 6.1 Estrategia: Actualizar Hooks

Por cada hook existente:

1. **Importar useHotel()**
2. **Añadir hotelId a queryKey**
3. **Probar que invalidate funciona**

### 6.2 Ejemplo: useLogbooks

**ANTES**:

```typescript
export function useLogbooks() {
  return useQuery({
    queryKey: ['logbooks'],
    queryFn: () => api.get('/api/logbooks'),
  });
}
```

**DESPUÉS**:

```typescript
export function useLogbooks() {
  const { hotel } = useHotel();

  return useQuery({
    queryKey: ['logbooks', { hotelId: hotel?.id }],
    queryFn: () => api.get('/api/logbooks'),
    enabled: !!hotel?.id,
  });
}
```

### 6.3 Verificación

1. Login como usuario de hotel
2. Ir a /dashboard/logbook
3. Ver datos cargados
4. Verificar que solo muestra datos del hotel correcto

---

## 7. Fase 6: Testing y Rollout

### 7.1 Testing Completo

```bash
# Backend
cd backend && pnpm test

# Frontend
cd frontend && pnpm test

# E2E Tests
# Probar flujos completos con Cypress/Playwright
```

### 7.2 Checklist de Testing

- [ ] Login con usuario existente
- [ ] Datos de logbook filtrados por hotel
- [ ] Datos de parking filtrados por hotel
- [ ] Datos de cashier filtrados por hotel
- [ ] APIs devuelven 400 si usuario sin hotel
- [ ] Frontend muestra selector si múltiples hotels

### 7.3 Deployment

1. **Deploy backend** con nuevas migraciones
2. **Deploy frontend** con nuevos contextos
3. **Monitorear errores** en los primeros días
4. **Backup de rollback** listo

---

## 8. Plan de Contingencia

### 8.1 Si falla la migración de DB

- Restaurar backup de Aiven
- Analizar error
- Ajustar script de migración
- Reintentar

### 8.2 Si falla un repository

- Revertir solo ese repository
- Continuar con otros módulos
- Investigar el problema

### 8.3 Si falla frontend

- Revertir a versión anterior
- Hotfix necesario
- Redeploy

### 8.4 Rollback Completo

```bash
# DB
mysql -h aiven-host -u user -p hotel_db < backup-pre-migration.sql

# Backend
git checkout HEAD~1
cd backend && pnpm install && pnpm dev

# Frontend
git checkout HEAD~1
cd frontend && pnpm install && pnpm dev
```

---

## 9. Timeline Estimado

| Fase | Duración | Total |
|------|----------|-------|
| Fase 1: DB | 1 día | Día 1 |
| Fase 2: Backend Core | 1-2 días | Días 2-3 |
| Fase 3: Backend Modules | 3-4 días | Días 4-7 |
| Fase 4: Frontend Core | 1 día | Día 8 |
| Fase 5: Frontend Modules | 2-3 días | Días 9-11 |
| Fase 6: Testing | 1-2 días | Días 12-13 |

**Total: ~2 semanas**

---

## 10. Comunicación

### 10.1 Durante la Migración

- Documentar cada paso en Slack
- Anotar problemas encontrados en ticket
- Mantener equipo informado diariamente

### 10.2 Post-Migración

- Actualizar documentación del proyecto
- Crear guía de nuevos features para usuarios
- Entrenar usuarios si hay cambios de UI

---

## 11. Checklist Final de Migración

- [ ] Backup de Aiven creado y verificado
- [ ] Script de migración probado en dev
- [ ] Script de rollback probado en dev
- [ ] Middleware de hotel funcionando
- [ ] HotelDB helper funcionando
- [ ] Todos los repositories actualizados
- [ ] Todos los tests pasando
- [ ] Frontend context implementado
- [ ] Frontend hooks actualizados
- [ ] Tests E2E pasando
- [ ] Documentación actualizada
- [ ] Team informado del deployment
- [ ] Monitoreo activo post-deployment
