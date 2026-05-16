# Cambios en el Frontend

## 1. Arquitectura General

El frontend de Next.js necesita cambios para manejar múltiples hoteles:

1. **HotelContext**: Estado global del hotel activo
2. **API Client**: Incluir `x-hotel-id` en headers
3. **React Query**: Keys incluyen `hotelId` para aislamiento
4. **Layouts**: Selector de hotel cuando corresponde

### 1.1 Stack de Datos

```
┌─────────────────────────────────────────────────────┐
│                    Next.js App                      │
├─────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │
│  │ HotelContext│  │ AuthContext │  │ UI State    │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┘  │
│         │                │                           │
│         ▼                ▼                           │
│  ┌─────────────────────────────────────────────┐    │
│  │              API Client                      │    │
│  │  - Headers: x-hotel-id                       │    │
│  │  - Credentials: include                      │    │
│  └─────────────────────────────────────────────┘    │
│                       │                             │
│                       ▼                             │
│  ┌─────────────────────────────────────────────┐    │
│  │            React Query                       │    │
│  │  - Keys: [key, { hotelId }]                  │    │
│  │  - Cache isolation por hotel                 │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## 2. Hotel Context

### 2.1 Crear: `frontend/stores/hotel-context.tsx`

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface Hotel {
  id: number;
  nombre: string;
  slug: string;
  settings?: Record<string, any>;
}

interface HotelContextType {
  hotel: Hotel | null;
  hotels: Hotel[];
  setHotel: (hotel: Hotel) => void;
  setHotels: (hotels: Hotel[]) => void;
  switchHotel: (hotelId: number) => Promise<void>;
  isLoading: boolean;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Inicializar desde localStorage o session
    const storedHotel = localStorage.getItem('activeHotel');
    const storedHotels = localStorage.getItem('userHotels');

    if (storedHotel) {
      setHotel(JSON.parse(storedHotel));
    }

    if (storedHotels) {
      setHotels(JSON.parse(storedHotels));
    }

    setIsLoading(false);
  }, []);

  const setHotelWithStorage = (newHotel: Hotel) => {
    setHotel(newHotel);
    localStorage.setItem('activeHotel', JSON.stringify(newHotel));
  };

  const switchHotel = async (hotelId: number) => {
    const newHotel = hotels.find((h) => h.id === hotelId);
    if (newHotel) {
      setHotelWithStorage(newHotel);
      // Invalidar todas las caches de React Query
      await queryClient.invalidateQueries({ queryKey: ['all'] });
    }
  };

  return (
    <HotelContext.Provider
      value={{
        hotel,
        hotels,
        setHotel: setHotelWithStorage,
        setHotels,
        switchHotel,
        isLoading,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error('useHotel debe usarse dentro de HotelProvider');
  }
  return context;
}
```

### 2.2 Integrar en Root Layout

```typescript
// frontend/app/layout.tsx

import { HotelProvider } from '@/stores/hotel-context';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <HotelProvider>
          {children}
        </HotelProvider>
      </body>
    </html>
  );
}
```

---

## 3. API Client Actualizado

### 3.1 Modificar: `frontend/lib/api-client.ts`

```typescript
'use client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface FetchOptions extends RequestInit {
  requiresAuth?: boolean;
  hotelId?: number;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { requiresAuth = true, hotelId, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers || {}),
  };

  // Añadir hotel_id si existe
  if (hotelId) {
    (headers as Record<string, string>)['x-hotel-id'] = hotelId.toString();
  }

  const finalOptions: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: 'include',
  };

  const response = await fetch(`${API_URL}${endpoint}`, finalOptions);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || 'Error en la petición');
  }

  return response.json();
}

// Helper methods
export const api = {
  get: <T>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(data) }),

  put: <T>(endpoint: string, data?: any, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string, options?: FetchOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),
};
```

---

## 4. React Query con Aislamiento por Hotel

### 4.1 Patrón de Keys

```typescript
// frontend/lib/query-keys.ts

export const queryKeys = {
  // Auth
  user: ['user'] as const,

  // Hotel
  hotel: ['hotel'] as const,
  hotels: ['hotels'] as const,

  // Con hotelId - LOGBOOK
  logbooks: (hotelId: number) => ['logbooks', { hotelId }] as const,
  logbook: (hotelId: number, id: number) => ['logbooks', { hotelId, id }] as const,

  // Con hotelId - PARKING
  parking: {
    all: (hotelId: number) => ['parking', { hotelId }] as const,
    spots: (hotelId: number) => ['parking', 'spots', { hotelId }] as const,
    bookings: (hotelId: number) => ['parking', 'bookings', { hotelId }] as const,
    stats: (hotelId: number) => ['parking', 'stats', { hotelId }] as const,
    availability: (hotelId: number, date: string) => 
      ['parking', 'availability', { hotelId, date }] as const,
  },

  // Con hotelId - CASHIER
  cashier: {
    shifts: (hotelId: number) => ['cashier', 'shifts', { hotelId }] as const,
    history: (hotelId: number) => ['cashier', 'history', { hotelId }] as const,
    daily: (hotelId: number, date: string) => ['cashier', 'daily', { hotelId, date }] as const,
  },

  // Con hotelId - GROUPS
  groups: (hotelId: number) => ['groups', { hotelId }] as const,
  group: (hotelId: number, id: number) => ['groups', { hotelId, id }] as const,

  // Con hotelId - MAINTENANCE
  maintenance: {
    all: (hotelId: number) => ['maintenance', { hotelId }] as const,
    reports: (hotelId: number) => ['maintenance', 'reports', { hotelId }] as const,
    stats: (hotelId: number) => ['maintenance', 'stats', { hotelId }] as const,
  },

  // Con hotelId - NOTIFICATIONS
  notifications: (hotelId: number) => ['notifications', { hotelId }] as const,

  // Con hotelId - BACKOFFICE
  backoffice: {
    invoices: (hotelId: number) => ['backoffice', 'invoices', { hotelId }] as const,
    suppliers: (hotelId: number) => ['backoffice', 'suppliers', { hotelId }] as const,
    summary: (hotelId: number) => ['backoffice', 'summary', { hotelId }] as const,
  },

  // Con hotelId - BLACKLIST
  blacklist: (hotelId: number) => ['blacklist', { hotelId }] as const,
};
```

### 4.2 Ejemplo de Hook con Hotel

```typescript
// frontend/hooks/use-logbooks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useHotel } from '@/stores/hotel-context';

interface Logbook {
  id: number;
  message: string;
  author_id: string | null;
  created_at: string;
  importance_level: string;
  department_id: number | null;
  is_solved: number;
  date: string | null;
}

export function useLogbooks() {
  const { hotel } = useHotel();

  return useQuery({
    queryKey: queryKeys.logbooks(hotel?.id || 0),
    queryFn: () => api.get<Logbook[]>('/api/logbooks'),
    enabled: !!hotel?.id,
    staleTime: 30 * 1000, // 30 segundos
  });
}

export function useLogbook(id: number) {
  const { hotel } = useHotel();

  return useQuery({
    queryKey: queryKeys.logbook(hotel?.id || 0, id),
    queryFn: () => api.get<Logbook>(`/api/logbooks/${id}`),
    enabled: !!hotel?.id && !!id,
  });
}

export function useCreateLogbook() {
  const queryClient = useQueryClient();
  const { hotel } = useHotel();

  return useMutation({
    mutationFn: (data: { message: string; importance_level: string; department_id?: number }) =>
      api.post<Logbook>('/api/logbooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.logbooks(hotel?.id || 0) });
    },
  });
}
```

### 4.3 Ejemplo: Hook de Parking

```typescript
// frontend/hooks/use-parking.ts

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useHotel } from '@/stores/hotel-context';

interface ParkingSpot {
  id: number;
  level_code: string;
  spot_number: number;
  spot_type: string;
  is_active: number;
  notes: string | null;
}

export function useParkingSpots() {
  const { hotel } = useHotel();

  return useQuery({
    queryKey: queryKeys.parking.spots(hotel?.id || 0),
    queryFn: () => api.get<ParkingSpot[]>('/api/parking/spots'),
    enabled: !!hotel?.id,
  });
}

export function useParkingAvailability(date: string) {
  const { hotel } = useHotel();

  return useQuery({
    queryKey: queryKeys.parking.availability(hotel?.id || 0, date),
    queryFn: () => api.get<ParkingSpot[]>(`/api/parking/availability?date=${date}`),
    enabled: !!hotel?.id && !!date,
  });
}
```

---

## 5. Selector de Hotel

### 5.1 Componente: `frontend/components/hotel-selector.tsx`

```typescript
'use client';

import { useHotel } from '@/stores/hotel-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

export function HotelSelector() {
  const { hotel, hotels, switchHotel } = useHotel();
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleSwitch = async (hotelId: number) => {
    await switchHotel(hotelId);

    // Invalidar todas las queries
    queryClient.clear();

    // Recargar página para reflejar el cambio
    router.refresh();
  };

  if (!hotel || hotels.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-500">Hotel:</span>
      <select
        value={hotel.id}
        onChange={(e) => handleSwitch(Number(e.target.value))}
        className="border rounded px-2 py-1 text-sm"
      >
        {hotels.map((h) => (
          <option key={h.id} value={h.id}>
            {h.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 5.2 Integrar en Dashboard Layout

```typescript
// frontend/app/dashboard/layout.tsx

import { HotelSelector } from '@/components/hotel-selector';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold">Four Points</h1>
          <HotelSelector />
          {/* ... resto del header */}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
```

---

## 6. AuthContext Actualizado

### 6.1 Modificar: `frontend/stores/auth-context.tsx`

```typescript
// Añadir al login response la información de hotels

interface LoginResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role_id: number;
  };
  hotel: {
    id: number;
    nombre: string;
    slug: string;
  } | null;
  hotels: Array<{
    id: number;
    nombre: string;
    slug: string;
  }>;
}

export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>('/api/auth/login', {
    email,
    password,
  });

  if (response.hotel) {
    setHotel(response.hotel);
    localStorage.setItem('activeHotel', JSON.stringify(response.hotel));
  }

  setHotels(response.hotels);
  localStorage.setItem('userHotels', JSON.stringify(response.hotels));

  return response;
}
```

---

## 7. Server Components con Hotel

### 7.1 Helper para Server Components

```typescript
// frontend/lib/server-fetch.ts

interface ServerFetchOptions {
  endpoint: string;
  hotelId?: number;
  cookies?: string;
}

export async function serverFetch<T>(options: ServerFetchOptions): Promise<T> {
  const { endpoint, hotelId, cookies } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (hotelId) {
    headers['x-hotel-id'] = hotelId.toString();
  }

  if (cookies) {
    headers['Cookie'] = cookies;
  }

  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`, {
    headers,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Error fetching ${endpoint}`);
  }

  return response.json();
}
```

### 7.2 Server Component con Hotel

```typescript
// frontend/app/dashboard/parking/page.tsx

import { cookies } from 'next/headers';
import { serverFetch } from '@/lib/server-fetch';

interface ParkingSpot {
  id: number;
  level_code: string;
  spot_number: number;
  spot_type: string;
  is_active: number;
}

export default async function ParkingPage() {
  const cookieStore = await cookies();
  const hotelId = cookieStore.get('hotel-id')?.value;

  const spaces = await serverFetch<ParkingSpot[]>({
    endpoint: '/api/parking/spots',
    hotelId: hotelId ? Number(hotelId) : undefined,
    cookies: cookieStore.toString(),
  });

  return (
    <div>
      <h1>Parking</h1>
      <div className="grid grid-cols-4 gap-4">
        {spaces.map((space) => (
          <div key={space.id} className="p-4 border rounded">
            {space.level_code}-{space.spot_number} - {space.spot_type}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 8. Resumen de Cambios en Frontend

| Componente | Archivo | Complejidad |
|------------|---------|-------------|
| HotelContext | `stores/hotel-context.tsx` | Media |
| API Client | `lib/api-client.ts` | Baja |
| Query Keys | `lib/query-keys.ts` | Media |
| HotelSelector | `components/hotel-selector.tsx` | Media |
| Dashboard Layout | `app/dashboard/layout.tsx` | Baja |
| Auth Context | `stores/auth-context.tsx` | Baja |
| Server Fetch | `lib/server-fetch.ts` | Baja |
| useLogbooks | `hooks/use-logbooks.ts` | Baja |
| useParking | `hooks/use-parking.ts` | Baja |
| useCashier | `hooks/use-cashier.ts` | Baja |
| useGroups | `hooks/use-groups.ts` | Baja |
| useMaintenance | `hooks/use-maintenance.ts` | Baja |
| useBackoffice | `hooks/use-backoffice.ts` | Baja |

**Total estimado**: 2-4 días de trabajo
