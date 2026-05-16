# Cambios en el Backend

## 1. Arquitectura General

El backend seguirá una arquitectura donde el `hotel_id` se extrae automáticamente del usuario autenticado y se propaga a todos los repositories sin necesidad de cambios en los controllers.

### 1.1 Flujo de una Request

```
Request HTTP
    │
    ▼
┌─────────────────────────┐
│  Auth Middleware        │  Verifica sesión (users.id es CHAR(36))
│  authenticateSession    │  Obtiene usuario
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Hotel Middleware       │  Extrae hotel_id
│  (NUEVO)                │  Injecta en req.hotelId
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Controller             │  No cambia
│  (sin cambios)          │  Usa req.hotelId si necesita
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Service                │  No cambia
│  (sin cambios)          │  Pasa req al repository
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Repository             │  Usa HotelDB helper
│  (actualizar)           │  Filtra automáticamente
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Database               │  Consulta filtrada
│  MySQL (Aiven)          │  WHERE hotel_id = ?
└─────────────────────────┘
```

---

## 2. Middleware de Hotel

### 2.1 Crear: `backend/middlewares/hotel-middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      hotelId?: number;
      hotel?: {
        id: number;
        nombre: string;
        slug: string;
        settings?: any;
      };
    }
  }
}

export interface HotelAuthRequest extends Request {
  hotelId: number;
  hotel: {
    id: number;
    nombre: string;
    slug: string;
    settings?: any;
  };
}

export const hotelMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // El usuario ya está autenticado por authenticateSession
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({ error: 'Usuario no autenticado' });
      return;
    }

    // Verificar que user tiene hotel_id
    if (user.hotel_id) {
      (req as HotelAuthRequest).hotelId = user.hotel_id;
      (req as HotelAuthRequest).hotel = {
        id: user.hotel_id,
        nombre: user.hotel_nombre || 'Hotel',
        slug: user.hotel_slug || '',
        settings: user.hotel_settings,
      };
      next();
      return;
    }

    // Usuario sin hotel asignado
    res.status(400).json({ error: 'Usuario sin hotel asignado' });
  } catch (error) {
    console.error('[HotelMiddleware] Error:', error);
    res.status(500).json({ error: 'Error al procesar hotel' });
  }
};
```

### 2.2 Integrar en `backend/index.ts`

```typescript
import { hotelMiddleware } from './middlewares/hotel-middleware.js';

// ... después de cookieParser

// Middleware de hotel (después de autenticación)
app.use(hotelMiddleware);
```

---

## 3. Query Helper con Filtro Automático

### 3.1 Crear: `backend/config/db-hotel.ts`

```typescript
import { RowDataPacket, Pool } from 'mysql2/promise';
import { HotelAuthRequest } from '../middlewares/hotel-middleware.js';
import { getPool } from './db.js';

type QueryResult = RowDataPacket[];

interface QueryOptions {
  query: string;
  params?: any[];
  requireHotel?: boolean;
}

export class HotelDB {
  private req: HotelAuthRequest;
  private pool: Pool;

  constructor(req: HotelAuthRequest) {
    this.req = req;
    this.pool = getPool();
  }

  /**
   * Añade WHERE hotel_id = ? a la query si hay hotel activo
   */
  withHotel(baseQuery: string, existingWhere?: string): string {
    if (this.req.hotelId === undefined || this.req.hotelId === null) {
      return baseQuery;
    }

    const hotelFilter = `hotel_id = ?`;
    
    if (existingWhere) {
      return `${baseQuery} ${existingWhere} AND ${hotelFilter}`;
    }

    return `${baseQuery} WHERE ${hotelFilter}`;
  }

  /**
   * Ejecuta query con hotel_id inyectado automáticamente
   */
  async query(options: QueryOptions): Promise<QueryResult> {
    const { query, params = [], requireHotel = true } = options;

    if (requireHotel && (this.req.hotelId === undefined || this.req.hotelId === null)) {
      throw new Error('Operación requiere un hotel activo');
    }

    // Inyectar hotel_id como último parámetro
    const finalParams = [...params, this.req.hotelId];
    const [rows] = await this.pool.query<RowDataPacket[]>(query, finalParams);
    return rows;
  }

  /**
   * Ejecuta query sin filtro de hotel (para datos globales)
   */
  async queryGlobal(query: string, params?: any[]): Promise<QueryResult> {
    const [rows] = await this.pool.query<RowDataPacket[]>(query, params);
    return rows;
  }

  /**
   * Obtiene el hotel activo
   */
  getHotel() {
    return this.req.hotel;
  }

  /**
   * Verifica si hay un hotel activo
   */
  hasHotel(): boolean {
    return this.req.hotelId !== undefined && this.req.hotelId !== null;
  }
}

/**
 * Factory function para usar en repositories
 */
export function createHotelDB(req: HotelAuthRequest): HotelDB {
  return new HotelDB(req);
}
```

### 3.2 Exportar en `backend/config/db.ts`

```typescript
// Añadir al final de db.ts
export { HotelDB, createHotelDB } from './db-hotel.js';
```

---

## 4. Ejemplo: Repository Actualizado

### 4.1 Logbook Repository: `backend/repositories/logbook/logbook-repository.ts`

```typescript
import { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../../config/db.js';
import { createHotelDB, HotelDB } from '../../config/db-hotel.js';
import { HotelAuthRequest } from '../../middlewares/hotel-middleware.js';

interface Logbook extends RowDataPacket {
  id: number;
  author_id: string | null;
  message: string;
  created_at: Date;
  importance_level: string;
  department_id: number | null;
  is_solved: number;
  date: Date | null;
  hotel_id: number;
}

export async function getLogbooks(
  req: HotelAuthRequest,
  limit = 50,
  offset = 0
): Promise<Logbook[]> {
  const db = createHotelDB(req);
  const pool = getPool();

  const query = db.withHotel('SELECT * FROM logbooks');
  const queryWithPagination = `${query} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

  const [rows] = await pool.query<RowDataPacket[]>(queryWithPagination, [limit, offset]);
  return rows as Logbook[];
}

export async function getLogbookById(
  req: HotelAuthRequest,
  id: number
): Promise<Logbook | null> {
  const db = createHotelDB(req);
  const pool = getPool();

  const query = db.withHotel('SELECT * FROM logbooks', 'WHERE id = ?');
  const [rows] = await pool.query<RowDataPacket[]>(query, [id]);

  return (rows[0] as Logbook) || null;
}

export async function createLogbook(
  req: HotelAuthRequest,
  data: { message: string; importance_level: string; department_id?: number; date?: Date }
): Promise<Logbook> {
  const db = createHotelDB(req);
  const pool = getPool();

  const query = `
    INSERT INTO logbooks 
    (message, importance_level, department_id, date, author_id, hotel_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query<ResultSetHeader>(query, [
    data.message,
    data.importance_level,
    data.department_id || null,
    data.date || null,
    req.user?.id || null,
    db.getHotel()?.id,
  ]);

  return {
    id: result.insertId,
    author_id: req.user?.id || null,
    message: data.message,
    created_at: new Date(),
    importance_level: data.importance_level,
    department_id: data.department_id || null,
    is_solved: 0,
    date: data.date || null,
    hotel_id: db.getHotel()?.id || 0,
  };
}
```

### 4.2 Parking Repository: `backend/repositories/parking/parking-repository.ts`

```typescript
import { RowDataPacket } from 'mysql2/promise';
import { getPool } from '../../config/db.js';
import { createHotelDB, HotelDB } from '../../config/db-hotel.js';
import { HotelAuthRequest } from '../../middlewares/hotel-middleware.js';

interface ParkingSpot extends RowDataPacket {
  id: number;
  level_code: string;
  spot_number: number;
  spot_type: string;
  is_active: number;
  notes: string | null;
  hotel_id: number;
}

export async function getParkingSpots(req: HotelAuthRequest): Promise<ParkingSpot[]> {
  const db = createHotelDB(req);
  const pool = getPool();

  const query = db.withHotel('SELECT * FROM parking_spots');
  const [rows] = await pool.query<RowDataPacket[]>(query);

  return rows as ParkingSpot[];
}

export async function getAvailableSpots(
  req: HotelAuthRequest,
  date: string
): Promise<ParkingSpot[]> {
  const db = createHotelDB(req);
  const pool = getPool();

  const query = db.withHotel(`
    SELECT ps.* 
    FROM parking_spots ps
    LEFT JOIN parking_availability pa ON ps.id = pa.spot_id AND pa.date = ?
    WHERE pa.is_available = 1 OR pa.id IS NULL
  `);

  const [rows] = await pool.query<RowDataPacket[]>(query, [date]);
  return rows as ParkingSpot[];
}
```

---

## 5. Cambios por Módulo

### 5.1 Resumen de Repositories a Actualizar

| Módulo | Repository | Archivo | Cambios |
|--------|-----------|---------|---------|
| **Logbook** | logbook-repository | `repositories/logbook/logbook-repository.ts` | Añadir hotel_id |
| **Parking** | parking-repository | `repositories/parking/parking-repository.ts` | Añadir hotel_id |
| **Cashier** | cashier-repository | `repositories/cashier/cashier-*.ts` | Filtro por hotel |
| **Groups** | group-repository | `repositories/group/group-*.ts` | Filtrar por hotel_id |
| **Maintenance** | maintenance-repository | `repositories/maintenance/maintenance-repository.ts` | Filtrar requests por hotel |
| **Messages** | message-repository | `repositories/messages/message-repository.ts` | Conversaciones por hotel |
| **Notifications** | notification-repository | `repositories/notifications/notification-repository.ts` | Notificaciones por hotel |
| **Backoffice** | backoffice-repository | `repositories/backoffice/backoffice-repository.ts` | Facturas y proveedores por hotel |
| **Blacklist** | blacklist-repository | `repositories/blacklist/blacklist-repository.ts` | Blacklist por hotel |

### 5.2 Repositories que NO cambian

- `repositories/auth/auth-repository.ts` - Autenticación es global
- `repositories/auth/user-repository.ts` - Users ya tiene hotel_id
- `repositories/departments/departments-repository.ts` - Datos globales

---

## 6. Cambios en Controllers

Los controllers **NO necesitan cambios significativos**. Solo asegurar que pasan `req` a los repositories.

### 6.1 Ejemplo de Controller Sin Cambios

```typescript
// backend/controllers/logbook/logbook-controllers.ts

import { getLogbooks, createLogbook } from '../../repositories/logbook/logbook-repository.js';
import { HotelAuthRequest } from '../../middlewares/hotel-middleware.js';

export const getLogbooksController = async (req: HotelAuthRequest, res: any) => {
  try {
    // El middleware ya injectó hotelId en req
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const logbooks = await getLogbooks(req, limit, offset);
    res.json(logbooks);
  } catch (error) {
    console.error('Error getting logbooks:', error);
    res.status(500).json({ error: 'Error al obtener logbooks' });
  }
};

export const createLogbookController = async (req: HotelAuthRequest, res: any) => {
  try {
    const { message, importance_level, department_id, date } = req.body;
    
    const newLogbook = await createLogbook(req, {
      message,
      importance_level,
      department_id,
      date: date ? new Date(date) : undefined,
    });
    
    res.status(201).json(newLogbook);
  } catch (error) {
    console.error('Error creating logbook:', error);
    res.status(500).json({ error: 'Error al crear logbook' });
  }
};
```

---

## 7. Cambios en Auth

### 7.1 Modificar Login para devolver hotel

```typescript
// backend/services/auth/auth-service.ts

import { getPool } from '../../config/db.js';
import { RowDataPacket } from 'mysql2/promise';

interface User extends RowDataPacket {
  id: string;
  username: string;
  email: string;
  role_id: number;
  hotel_id: number;
}

export async function login(email: string, password: string) {
  const pool = getPool();
  
  // Verificar usuario
  const [users] = await pool.query<User[]>(
    'SELECT id, username, email, role_id, hotel_id FROM users WHERE email = ? AND is_active = 1',
    [email]
  );

  const user = users[0];
  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Devolver info del usuario y su hotel
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role_id: user.role_id,
    },
    hotel: {
      id: user.hotel_id,
    },
  };
}
```

---

## 8. TypeScript: Añadir tipos

### 8.1 Actualizar `backend/types/express.d.ts`

```typescript
// Añadir al archivo existente

import { Hotel } from '../models/hotel.js';

declare global {
  namespace Express {
    interface Request {
      hotelId?: number;
      hotel?: {
        id: number;
        nombre: string;
        slug: string;
        settings?: any;
      };
    }
  }
}
```

### 8.2 Nuevo tipo: `backend/models/hotel.ts`

```typescript
export interface Hotel {
  id: number;
  nombre: string;
  slug: string;
  settings?: Record<string, any>;
  timezone: string;
  moneda: string;
  idioma: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}
```

---

## 9. Resumen de Cambios en Backend

| Componente | Cambio | Complejidad |
|------------|--------|-------------|
| `index.ts` | Añadir middleware | Baja |
| `middlewares/hotel-middleware.ts` | Nuevo archivo | Media |
| `config/db-hotel.ts` | Helper de queries | Media |
| `config/db.ts` | Exportar HotelDB | Baja |
| `models/hotel.ts` | Nuevo archivo | Baja |
| Repositories (~10) | Añadir hotel_id a queries | Media |
| Controllers | Sin cambios o mínimos | Baja |
| Auth Service | Devolver hotel_id | Baja |
| Types | Añadir tipos de hotel | Baja |

**Total estimado**: 3-5 días de trabajo
