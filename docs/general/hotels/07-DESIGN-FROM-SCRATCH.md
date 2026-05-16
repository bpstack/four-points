# Diseño Multi-Hotel desde Cero

## 1. Introducción

Este documento describe cómo debería haberse diseñado Four-Points desde el principio para soportar múltiples hotels de forma nativa, escalable y mantenible. Se basa en la estructura actual del proyecto y propone el enfoque óptimo.

---

## 2. Principios Fundamentales

### 2.1 El Error Común: "Lo añadimos después"

**Lo que suele pasar:**
```
Fase 1: "Solo necesitamos un hotel, añadiremos multi-hotel después"
Fase 2: "Ya funciona, no toques lo que funciona"
Fase 3: "Necesitamos multi-hotel... ahora todo el código es spaghetti"
```

**El resultado:**
- `WHERE hotel_id = ?` añadidos manualmente en cada query
- `x-hotel-id` headers añadidos en cada API call
- Cache de React Query mezclada entre hotels
- Bugs difíciles de debuggear

### 2.2 El Enfoque Correcto: "Data Isolation como默认值"

**Diseño correcto desde el principio:**

```
┌─────────────────────────────────────────────────────┐
│             Capa de Abstracción                     │
│  ┌─────────────────────────────────────────────┐   │
│  │  Repository Layer                           │   │
│  │  - TODAS las queries usan HotelContext      │   │
│  │  - Filtro automático por hotel_id           │   │
│  │  - Nadie escribe WHERE hotel_id manualmente │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
         │   HotelContext injecta    │
         │   hotel_id en cada        │
         │   request                 │
         │                           │
┌────────┴────────┐     ┌────────────┴────────────┐
│  Frontend       │     │  Backend                 │
│  - Zustand      │     │  - Express Middleware    │
│  - React Query  │     │  - Repositories          │
│  - API Client   │     │  - Services              │
└─────────────────┘     └───────────────────────────┘
```

---

## 3. Diseño de Base de Datos

### 3.1 Estructura de Tablas

```sql
-- ============================================
-- 1. TABLA DE HOTELS (siempre primera)
-- ============================================
CREATE TABLE hotels (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,  -- Para subdominios
    name VARCHAR(255) NOT NULL,
    settings JSON,                       -- Configuración específica
    timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
    currency VARCHAR(3) DEFAULT 'EUR',
    language VARCHAR(10) DEFAULT 'es',
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_slug (slug),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- 2. USUARIOS - SIEMPRE con hotel_id
-- ============================================
CREATE TABLE users (
    id CHAR(36) NOT NULL PRIMARY KEY,  -- UUID
    hotel_id INT UNSIGNED NOT NULL,     -- SIEMPRE obligatorio
    
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    
    is_active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_users_hotel FOREIGN KEY (hotel_id) 
        REFERENCES hotels(id) ON DELETE RESTRICT,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) 
        REFERENCES roles(id) ON DELETE RESTRICT,
        
    INDEX idx_users_hotel (hotel_id),
    INDEX idx_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================
-- 3. TODAS las tablas operativas
-- ============================================
CREATE TABLE logbooks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT UNSIGNED NOT NULL,     -- SIEMPRE
    author_id CHAR(36),                  -- FK a users
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_logbooks_hotel FOREIGN KEY (hotel_id) 
        REFERENCES hotels(id) ON DELETE RESTRICT,
    CONSTRAINT fk_logbooks_author FOREIGN KEY (author_id) 
        REFERENCES users(id) ON DELETE SET NULL,
        
    INDEX idx_logbooks_hotel (hotel_id),
    INDEX idx_logbooks_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Repetir pattern para TODAS las tablas:
-- parking_spots, parking_bookings, cashier_shifts, etc.
```

### 3.2 Regla de Oro

> **Cada tabla que contiene datos de un hotel específico DEBE tener `hotel_id` como primer índice después de la PK.**

```sql
-- ✅ CORRECTO
CREATE TABLE cashier_shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hotel_id INT UNSIGNED NOT NULL,  -- Primero después de PK
    shift_date DATE NOT NULL,
    ...
    INDEX idx_shifts_hotel_date (hotel_id, shift_date)
);

-- ❌ INCORRECTO
CREATE TABLE cashier_shifts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    shift_date DATE NOT NULL,         -- Falta hotel_id
    ...
);
```

---

## 4. Diseño del Backend

### 4.1 Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                      index.ts                                    │
│  - Configuración de middlewares                                 │
│  - Rutas                                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Route Layer                                    │
│  /api/logbooks          → logbook-routes.ts                     │
│  /api/cashier           → cashier-routes.ts                      │
│  /api/parking           → parking-routes.ts                      │
│                                                                 │
│  ⚠️ NOHay lógica de negocio aquí, solo configuración de rutas   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Controller Layer                                  │
│  logbook-controller.ts      │ cashier-controller.ts             │
│  - Extraer parámetros      │ - Extraer parámetros              │
│  - Llamar servicios        │ - Llamar servicios                │
│  - Responder               │ - Responder                       │
│                                                                 │
│  ⚠️ NOHay acceso a DB directamente                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                Service Layer                                     │
│  logbook-service.ts         │ cashier-service.ts                │
│  - Lógica de negocio        │ - Lógica de negocio              │
│  - Validaciones             │ - Validaciones                   │
│  - Llamar repositories      │ - Llamar repositories            │
│                                                                 │
│  ⚠️ NOHay queries SQL directas                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               Repository Layer                                   │
│  logbook-repository.ts      │ cashier-repository.ts             │
│  - Consultas SQL            │ - Consultas SQL                  │
│  - Usa HotelRepository      │ - Usa HotelRepository            │
│                                                                 │
│  ✅ Aquí es donde se aplica el filtro de hotel                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Middleware de Hotel (EL CENTRO DEL SISTEMA)

```typescript
// middlewares/hotel-context.ts
import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    hotel_id: number;
    role_id: number;
    email: string;
  };
  hotel: {
    id: number;
    name: string;
    slug: string;
    settings: Record<string, any>;
  };
}

export const hotelContextMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // El usuario ya está autenticado por authenticateSession
  const { user } = req;
  
  if (!user?.hotel_id) {
    return res.status(400).json({
      error: 'USER_WITHOUT_HOTEL',
      message: 'El usuario no tiene un hotel asignado',
    });
  }

  // Inyectar información del hotel en el request
  // (Se podría cachear en Redis para evitar queries repetidas)
  req.hotel = {
    id: user.hotel_id,
    name: user.hotel_name || 'Hotel',
    slug: user.hotel_slug || '',
    settings: user.hotel_settings || {},
  };

  next();
};
```

### 4.3 Repository Base con Filtro Automático

```typescript
// repositories/base-repository.ts

import { RowDataPacket, Pool } from 'mysql2/promise';
import { AuthenticatedRequest } from '../middlewares/hotel-context.js';

interface QueryOptions {
  query: string;
  params?: any[];
  requireHotel?: boolean;
}

export abstract class BaseRepository<T extends RowDataPacket> {
  protected pool: Pool;
  protected req: AuthenticatedRequest;

  constructor(pool: Pool, req: AuthenticatedRequest) {
    this.pool = pool;
    this.req = req;
  }

  /**
   * Añade WHERE hotel_id = ? automáticamente
   * Usa la tabla del repositorio o la especificada
   */
  protected withHotel(
    baseQuery: string, 
    tableAlias?: string
  ): string {
    const table = tableAlias || this.getTableName();
    return `${baseQuery} WHERE ${table}.hotel_id = ?`;
  }

  /**
   * Alias para withHotel para compatibilidad
   */
  protected whereHotel(baseQuery: string): string {
    return this.withHotel(baseQuery);
  }

  /**
   * Query con filtro de hotel automático
   */
  protected async find(options: QueryOptions): Promise<T[]> {
    const { query, params = [], requireHotel = true } = options;

    if (requireHotel && !this.req.user?.hotel_id) {
      throw new Error('Operación requiere hotel_id');
    }

    // Si no requiere hotel (datos globales), no añadir filtro
    if (!requireHotel) {
      const [rows] = await this.pool.query<T[]>(query, params);
      return rows;
    }

    // Añadir hotel_id como último parámetro
    const finalParams = [...params, this.req.user.hotel_id];
    const [rows] = await this.pool.query<T[]>(query, finalParams);
    return rows;
  }

  /**
   * Query de tipo SELECT * con filtro hotel
   */
  protected async findAll(extraWhere?: string): Promise<T[]> {
    const baseQuery = `SELECT * FROM ${this.getTableName()}`;
    const query = this.withHotel(baseQuery, extraWhere ? `WHERE ${extraWhere}` : undefined);
    return this.find({ query });
  }

  /**
   * Query por ID (con filtro hotel)
   */
  protected async findById(id: number): Promise<T | null> {
    const query = this.withHotel(
      `SELECT * FROM ${this.getTableName()} WHERE id = ?`
    );
    const rows = await this.find({ query, params: [id] });
    return rows[0] || null;
  }

  /**
   * Insertar (con hotel_id automático)
   */
  protected async create(data: Partial<T>): Promise<T> {
    const table = this.getTableName();
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(', ');

    // Añadir hotel_id si no viene en los datos
    if (!columns.includes('hotel_id')) {
      columns.push('hotel_id');
      values.push(this.req.user.hotel_id);
    }

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
    `;

    const [result] = await this.pool.query<ResultSetHeader>(query, values);
    
    return this.findById(result.insertId) as Promise<T>;
  }

  /**
   * Obtener nombre de tabla (override en cada repositorio)
   */
  protected abstract getTableName(): string;
}
```

### 4.4 Repository Concreto (Logbook)

```typescript
// repositories/logbook-repository.ts

import { Pool } from 'mysql2/promise';
import { BaseRepository } from './base-repository.js';
import { AuthenticatedRequest } from '../middlewares/hotel-context.js';
import { RowDataPacket } from 'mysql2/promise';

interface Logbook extends RowDataPacket {
  id: number;
  hotel_id: number;
  author_id: string | null;
  message: string;
  created_at: Date;
  importance_level: string;
  department_id: number | null;
  is_solved: number;
}

export class LogbookRepository extends BaseRepository<Logbook> {
  protected getTableName(): string {
    return 'logbooks';
  }

  /**
   * Obtener logbooks por fecha
   */
  async findByDate(date: string, limit = 50, offset = 0): Promise<Logbook[]> {
    const query = this.withHotel(`
      SELECT * FROM logbooks 
      WHERE date = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `);
    
    return this.find({ query, params: [date, limit, offset] });
  }

  /**
   * Obtener logbook por ID
   */
  async findById(id: number): Promise<Logbook | null> {
    return super.findById(id);
  }

  /**
   * Crear nuevo logbook
   */
  async create(data: {
    message: string;
    importance_level: string;
    department_id?: number;
    date?: string;
  }): Promise<Logbook> {
    return super.create({
      ...data,
      hotel_id: this.req.user.hotel_id,
      author_id: this.req.user.id,
    });
  }

  /**
   * Actualizar logbook
   */
  async update(id: number, data: Partial<Logbook>): Promise<Logbook | null> {
    const table = this.getTableName();
    const columns = Object.keys(data);
    const values = Object.values(data);

    // Añadir updated_at
    columns.push('updated_at');
    values.push(new Date());

    const query = this.withHotel(`
      UPDATE ${table}
      SET ${columns.map((col) => `${col} = ?`).join(', ')}
      WHERE id = ?
    `);

    await this.find({ 
      query, 
      params: [...values, id] 
    });

    return this.findById(id);
  }

  /**
   * Eliminar logbook
   */
  async delete(id: number): Promise<boolean> {
    const query = this.withHotel(
      `DELETE FROM ${this.getTableName()} WHERE id = ?`
    );
    
    await this.find({ query, params: [id] });
    return true;
  }

  /**
   * Contar por estado
   */
  async countByStatus(): Promise<{ solved: number; pending: number }> {
    const query = this.withHotel(`
      SELECT 
        SUM(CASE WHEN is_solved = 1 THEN 1 ELSE 0 END) as solved,
        SUM(CASE WHEN is_solved = 0 THEN 1 ELSE 0 END) as pending
      FROM ${this.getTableName()}
    `);
    
    const rows = await this.find({ query, requireHotel: true });
    return rows[0] as { solved: number; pending: number };
  }
}

// Factory function
export function createLogbookRepository(
  pool: Pool, 
  req: AuthenticatedRequest
): LogbookRepository {
  return new LogbookRepository(pool, req);
}
```

### 4.5 Controller (Ligero, solo coordinación)

```typescript
// controllers/logbook-controller.ts

import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/hotel-context.js';
import { createLogbookRepository } from '../repositories/logbook-repository.js';
import { getPool } from '../config/db.js';

export const logbookController = {
  /**
   * GET /api/logbooks
   * Obtener logbooks del día
   */
  getByDate: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { date, limit = 50, offset = 0 } = req.query;
      const pool = getPool();
      const repository = createLogbookRepository(pool, req);
      
      const logbooks = await repository.findByDate(
        date as string, 
        Number(limit), 
        Number(offset)
      );

      res.json(logbooks);
    } catch (error) {
      console.error('Error getting logbooks:', error);
      res.status(500).json({ error: 'Error al obtener logbooks' });
    }
  },

  /**
   * GET /api/logbooks/:id
   * Obtener un logbook específico
   */
  getById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const pool = getPool();
      const repository = createLogbookRepository(pool, req);
      
      const logbook = await repository.findById(Number(id));

      if (!logbook) {
        return res.status(404).json({ error: 'Logbook no encontrado' });
      }

      res.json(logbook);
    } catch (error) {
      console.error('Error getting logbook:', error);
      res.status(500).json({ error: 'Error al obtener logbook' });
    }
  },

  /**
   * POST /api/logbooks
   * Crear nuevo logbook
   */
  create: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { message, importance_level, department_id, date } = req.body;
      const pool = getPool();
      const repository = createLogbookRepository(pool, req);
      
      const logbook = await repository.create({
        message,
        importance_level,
        department_id,
        date,
      });

      res.status(201).json(logbook);
    } catch (error) {
      console.error('Error creating logbook:', error);
      res.status(500).json({ error: 'Error al crear logbook' });
    }
  },

  /**
   * PATCH /api/logbooks/:id
   * Actualizar logbook
   */
  update: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { message, importance_level, department_id } = req.body;
      
      const pool = getPool();
      const repository = createLogbookRepository(pool, req);
      
      const logbook = await repository.update(Number(id), {
        message,
        importance_level,
        department_id,
      });

      res.json(logbook);
    } catch (error) {
      console.error('Error updating logbook:', error);
      res.status(500).json({ error: 'Error al actualizar logbook' });
    }
  },

  /**
   * DELETE /api/logbooks/:id
   * Eliminar logbook
   */
  delete: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const pool = getPool();
      const repository = createLogbookRepository(pool, req);
      
      await repository.delete(Number(id));

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting logbook:', error);
      res.status(500).json({ error: 'Error al eliminar logbook' });
    }
  },
};
```

---

## 5. Diseño del Frontend

### 5.1 Arquitectura de Estado

```
┌─────────────────────────────────────────────────────┐
│              Proveedores de Contexto                 │
├─────────────────────────────────────────────────────┤
│  1. AuthProvider (auth-context.tsx)                 │
│     - user: { id, email, role_id, hotel_id }        │
│     - login(), logout(), isAuthenticated             │
│                                                      │
│  2. HotelProvider (hotel-context.tsx) [NUEVO]       │
│     - hotel: { id, name, slug, settings }           │
│     - hotels: [{ id, name, slug }, ...]             │
│     - switchHotel(hotelId)                          │
│                                                      │
│  3. QueryClientProvider (@tanstack/react-query)     │
│     - Cache de datos con keys que incluyen hotelId  │
└─────────────────────────────────────────────────────┘
```

### 5.2 Hotel Context (Zustand + React Query)

```typescript
// stores/useHotelStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useQueryClient } from '@tanstack/react-query';

interface Hotel {
  id: number;
  name: string;
  slug: string;
  settings?: Record<string, unknown>;
}

interface HotelStore {
  // Estado
  hotel: Hotel | null;
  hotels: Hotel[];
  isLoading: boolean;
  
  // Acciones
  setHotel: (hotel: Hotel) => void;
  setHotels: (hotels: Hotel[]) => void;
  switchHotel: (hotelId: number) => Promise<void>;
  reset: () => void;
}

export const useHotelStore = create<HotelStore>()(
  persist(
    (set, get) => ({
      hotel: null,
      hotels: [],
      isLoading: true,

      setHotel: (hotel) => {
        set({ hotel });
        if (typeof window !== 'undefined') {
          localStorage.setItem('activeHotel', JSON.stringify(hotel));
        }
      },

      setHotels: (hotels) => {
        set({ hotels });
        if (typeof window !== 'undefined') {
          localStorage.setItem('userHotels', JSON.stringify(hotels));
        }
      },

      switchHotel: async (hotelId) => {
        const { hotels, setHotel } = get();
        const newHotel = hotels.find((h) => h.id === hotelId);
        
        if (newHotel) {
          setHotel(newHotel);
          
          // Invalidar TODAS las queries de React Query
          const queryClient = useQueryClient();
          queryClient.invalidateQueries({ queryKey: ['all'] });
          
          // Opcional: recargar la página para estado limpio
          if (typeof window !== 'undefined') {
            window.location.reload();
          }
        }
      },

      reset: () => set({ hotel: null, hotels: [] }),
    }),
    {
      name: 'hotel-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        hotel: state.hotel,
        hotels: state.hotels,
      }),
    }
  )
);

// Selectores optimizados
export const useHotel = () => useHotelStore((s) => s.hotel);
export const useHotels = () => useHotelStore((s) => s.hotels);
export const useActiveHotelId = () => useHotelStore((s) => s.hotel?.id ?? 0);
```

### 5.3 API Client con Hotel Header

```typescript
// lib/apiClient.ts
import apiClient from './apiClient';

function getHotelHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const hotel = localStorage.getItem('activeHotel');
  if (!hotel) return {};
  
  const { id } = JSON.parse(hotel);
  return { 'x-hotel-id': String(id) };
}

// Modificar fetchWithRefresh para incluir hotel header
const finalOptions: RequestInit = {
  ...fetchOptions,
  headers: {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...getHotelHeaders(),  // ← AÑADIR ESTO
    ...fetchOptions.headers,
  },
  credentials: 'include',
};
```

### 5.4 Query Keys con HotelId

```typescript
// lib/query-keys.ts

/**
 * Factory function para crear keys con hotelId
 * Garantiza que cada hotel tiene su propio cache
 */
export function createQueryKeys(hotelId: number) {
  return {
    // Prefijo de hotel
    hotel: ['hotel', hotelId] as const,
    
    // Logbooks
    logbooks: {
      all: ['logbooks', hotelId] as const,
      list: (date: string) => ['logbooks', hotelId, 'list', date] as const,
      detail: (id: number) => ['logbooks', hotelId, 'detail', id] as const,
    },
    
    // Parking
    parking: {
      spots: ['parking', hotelId, 'spots'] as const,
      bookings: ['parking', hotelId, 'bookings'] as const,
      availability: (date: string) => ['parking', hotelId, 'availability', date] as const,
    },
    
    // Cashier
    cashier: {
      daily: (date: string) => ['cashier', hotelId, 'daily', date] as const,
      shifts: (date: string) => ['cashier', hotelId, 'shifts', date] as const,
      shift: (id: number) => ['cashier', hotelId, 'shift', id] as const,
    },
    
    // Groups
    groups: {
      all: ['groups', hotelId] as const,
      detail: (id: number) => ['groups', hotelId, id] as const,
    },
    
    // Maintenance
    maintenance: {
      all: ['maintenance', hotelId] as const,
      detail: (id: string) => ['maintenance', hotelId, id] as const,
    },
    
    // Notifications
    notifications: ['notifications', hotelId] as const,
    
    // Dashboard
    dashboard: ['dashboard', hotelId] as const,
  };
}

// Uso en hooks
export function useLogbooks(date: string) {
  const hotelId = useActiveHotelId();
  const keys = createQueryKeys(hotelId);
  
  return useQuery({
    queryKey: keys.logbooks.list(date),
    queryFn: () => logbooksApi.getByDate(date),
  });
}

export function useParkingSpots() {
  const hotelId = useActiveHotelId();
  const keys = createQueryKeys(hotelId);
  
  return useQuery({
    queryKey: keys.parking.spots,
    queryFn: () => parkingApi.getSpots(),
  });
}
```

### 5.5 Hotel Selector Component

```typescript
// components/HotelSelector.tsx
'use client';

import { useHotel, useHotels, useHotelStore } from '@/stores/useHotelStore';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export function HotelSelector() {
  const { hotel, hotels, switchHotel } = useHotel();
  const router = useRouter();
  const queryClient = useQueryClient();

  if (!hotel || hotels.length <= 1) {
    return null;
  }

  const handleChange = async (newHotelId: number) => {
    await switchHotel(newHotelId);
    
    // Invalidar todo el cache
    queryClient.clear();
    
    // Recargar página para estado limpio
    router.refresh();
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Hotel:</span>
      <select
        value={hotel.id}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="border rounded px-2 py-1 text-sm"
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

---

## 6. Diferencias: Diseño Correcto vs Actual

### 6.1 Backend

| Aspecto | Actual (Problemático) | Correcto (desde 0) |
|---------|----------------------|-------------------|
| Filtro hotel | Manual en cada query | Automático en BaseRepository |
| Query keys | Sin hotel_id | `withHotel()` automático |
| Controllers | Acceden a DB | Solo coordinan servicios |
| Middleware | Sin hotel context | HotelContextMiddleware |
| Tests | Con datos mezclados | Tests aislados por hotel |

### 6.2 Frontend

| Aspecto | Actual (Problemático) | Correcto (desde 0) |
|---------|----------------------|-------------------|
| Query Keys | `['logbooks']` | `['logbooks', hotelId]` |
| Cache | Compartido entre hotels | Aislado por hotel |
| API Client | Sin hotel header | `x-hotel-id` automático |
| Stores | Sin hotel context | useHotelStore |
| Invalidación | Manual | Automática en switchHotel |

---

## 7. Checklist de Diseño Multi-Hotel

### 7.1 Base de Datos

- [ ] Tabla `hoteles` creada primero
- [ ] `users.hotel_id` NOT NULL desde el inicio
- [ ] Cada tabla operativa tiene `hotel_id`
- [ ] FK constraints bien definidas
- [ ] Índices en `hotel_id` (después de PK)

### 7.2 Backend

- [ ] `HotelContextMiddleware` como primer middleware
- [ ] `BaseRepository` con `withHotel()` automático
- [ ] Ningún controller hace queries directas
- [ ] Tests verifican aislamiento por hotel
- [ ] Documentación de patrón de repository

### 7.3 Frontend

- [ ] `useHotelStore` con Zustand + persist
- [ ] API Client envía `x-hotel-id` header
- [ ] Query keys incluyen `hotelId`
- [ ] `switchHotel()` invalid cache
- [ ] Hotel Selector visible cuando hay múltiples hotels

---

## 8. Patrón de Growth: De 1 a N Hotels

### 8.1 Fase 1: Un Hotel (MVP)

```sql
-- Solo existe el hotel 1
INSERT INTO hotels (id, name, slug) VALUES (1, 'Four Points', 'four-points');
-- Todos los usuarios tienen hotel_id = 1
```

### 8.2 Fase 2: Segundo Hotel

```sql
-- Añadir hotel 2
INSERT INTO hotels (id, name, slug) VALUES (2, 'Hotel Costa', 'hotel-costa');

-- Crear usuarios para hotel 2
INSERT INTO users (id, username, email, password, hotel_id, role_id)
VALUES 
  (UUID(), 'admin_costa', 'admin@hotelcosta.com', 'hash...', 2, 2);
```

### 8.3 Fase 3: Usuario Multi-Hotel

```sql
-- Tabla de relación (si se necesita)
CREATE TABLE user_hotels (
  user_id CHAR(36) NOT NULL,
  hotel_id INT UNSIGNED NOT NULL,
  role ENUM('admin', 'recepcionista', 'manager') DEFAULT 'recepcionista',
  is_active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (user_id, hotel_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE
);

-- Migrar usuario existente
INSERT INTO user_hotels (user_id, hotel_id, role)
SELECT id, hotel_id, 
  CASE WHEN role_id = 2 THEN 'admin' ELSE 'recepcionista' END
FROM users;
```

---

## 9. Conclusión

Diseñar para multi-hotel desde el principio **no es más difícil**, solo requiere:

1. **Base de datos**: `hotel_id` en todas las tablas operativas desde el día 1
2. **Backend**: Un `BaseRepository` que filtra automáticamente
3. **Frontend**: Un `useHotelStore` y query keys con `hotelId`

El esfuerzo adicional inicial se recupera multiplicado en:
- Menos bugs
- Código más mantenible
- Onboarding de nuevos hotels trivial
- Tests más robustos

**La regla de oro:**

> "Si tienes que añadir `WHERE hotel_id = ?` manualmente en más de un lugar, tu arquitectura está mal diseñada."
