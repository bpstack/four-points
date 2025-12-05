// app/lib/blacklist/mockData.ts
/**
 * Datos mock para testing sin backend
 */

import type { BlacklistEntry, AuditEntry, BlacklistResponse } from './types'

// ========================================
// MOCK: Registros de blacklist
// ========================================
export const mockBlacklistEntries: BlacklistEntry[] = [
  {
    id: '1',
    guest_name: 'Juan García Martínez',
    document_type: 'DNI',
    document_number: '12345678A',
    check_in_date: '2024-11-20T00:00:00Z',
    check_out_date: '2024-11-25T00:00:00Z',
    reason:
      'Daños graves en la habitación 305. Rompió el televisor, quemó las cortinas con cigarrillos y dejó manchas en las paredes. Se negó a pagar los daños.',
    severity: 'CRITICAL',
    images: [
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800',
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
      'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800',
    ],
    comments:
      'Cliente muy agresivo con el personal. Llegó en estado de embriaguez y causó disturbios en el pasillo. No se recomienda aceptar reservas futuras bajo ninguna circunstancia.',
    status: 'ACTIVE',
    created_by: 'user-1',
    created_by_username: 'Salvador',
    created_at: '2024-11-25T14:30:00Z',
    updated_at: '2024-11-26T10:15:00Z',
  },
  {
    id: '2',
    guest_name: 'María López Fernández',
    document_type: 'PASSPORT',
    document_number: 'AB123456',
    check_in_date: '2024-11-15T00:00:00Z',
    check_out_date: '2024-11-17T00:00:00Z',
    reason:
      'Comportamiento inadecuado con el personal de limpieza. Realizó comentarios ofensivos y racistas. Personal se sintió amenazado.',
    severity: 'HIGH',
    images: ['https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800'],
    comments:
      'Pese a ser advertida por el gerente, continuó con su comportamiento. Se le solicitó abandonar el hotel un día antes de su check-out programado.',
    status: 'ACTIVE',
    created_by: 'user-2',
    created_by_username: 'Ana García',
    created_at: '2024-11-17T09:00:00Z',
  },
  {
    id: '3',
    guest_name: 'Carlos Rodríguez Sánchez',
    document_type: 'NIE',
    document_number: 'X1234567Z',
    check_in_date: '2024-10-10T00:00:00Z',
    check_out_date: '2024-10-12T00:00:00Z',
    reason:
      'Ruidos molestos hasta altas horas de la madrugada. Múltiples quejas de otros huéspedes. Fiesta no autorizada en la habitación.',
    severity: 'MEDIUM',
    images: [
      'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=800',
      'https://images.unsplash.com/photo-1631049035182-249067d7618e?w=800',
    ],
    comments:
      'Después de 3 advertencias, se le aplicó cargo adicional por molestias. Aceptó pagar pero mostró actitud desafiante.',
    status: 'ACTIVE',
    created_by: 'user-1',
    created_by_username: 'Salvador',
    created_at: '2024-10-12T08:30:00Z',
  },
  {
    id: '4',
    guest_name: 'Laura Martín Torres',
    document_type: 'DNI',
    document_number: '98765432B',
    check_in_date: '2024-09-05T00:00:00Z',
    check_out_date: '2024-09-08T00:00:00Z',
    reason:
      'Intento de robo de artículos del minibar sin pagar. Se encontraron productos escondidos en su equipaje durante el check-out.',
    severity: 'MEDIUM',
    images: ['https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=800'],
    comments:
      'Se le cobró el importe total más una penalización. Pagó sin problemas pero se mostró incómoda. Incidente menor pero requiere seguimiento.',
    status: 'ACTIVE',
    created_by: 'user-3',
    created_by_username: 'Pedro Ruiz',
    created_at: '2024-09-08T11:00:00Z',
  },
  {
    id: '5',
    guest_name: 'Antonio Pérez Gómez',
    document_type: 'DNI',
    document_number: '45678912C',
    check_in_date: '2024-08-20T00:00:00Z',
    check_out_date: '2024-08-22T00:00:00Z',
    reason:
      'Fumó en habitación no fumadores a pesar de múltiples advertencias. Activó la alarma de incendios.',
    severity: 'LOW',
    images: ['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800'],
    comments:
      'Se le aplicó cargo por limpieza profunda. Se disculpó y pagó sin problemas. Incidente registrado como precaución.',
    status: 'DELETED',
    created_by: 'user-2',
    created_by_username: 'Ana García',
    created_at: '2024-08-22T10:00:00Z',
    deleted_at: '2024-11-01T15:00:00Z',
    deleted_by: 'user-1',
  },
]

// ========================================
// MOCK: Audit trail
// ========================================
export const mockAuditTrail: Record<string, AuditEntry[]> = {
  '1': [
    {
      id: 'audit-1-1',
      blacklist_id: '1',
      action: 'CREATE',
      changed_by: 'user-1',
      changed_by_username: 'Salvador',
      timestamp: '2024-11-25T14:30:00Z',
      ip_address: '192.168.1.100',
    },
    {
      id: 'audit-1-2',
      blacklist_id: '1',
      action: 'UPDATE',
      changed_by: 'user-1',
      changed_by_username: 'Salvador',
      changed_fields: {
        severity: { old: 'HIGH', new: 'CRITICAL' },
        comments: {
          old: 'Cliente agresivo con el personal.',
          new: 'Cliente muy agresivo con el personal. Llegó en estado de embriaguez y causó disturbios en el pasillo. No se recomienda aceptar reservas futuras bajo ninguna circunstancia.',
        },
      },
      timestamp: '2024-11-26T10:15:00Z',
      ip_address: '192.168.1.100',
    },
  ],
  '2': [
    {
      id: 'audit-2-1',
      blacklist_id: '2',
      action: 'CREATE',
      changed_by: 'user-2',
      changed_by_username: 'Ana García',
      timestamp: '2024-11-17T09:00:00Z',
      ip_address: '192.168.1.105',
    },
  ],
  '3': [
    {
      id: 'audit-3-1',
      blacklist_id: '3',
      action: 'CREATE',
      changed_by: 'user-1',
      changed_by_username: 'Salvador',
      timestamp: '2024-10-12T08:30:00Z',
      ip_address: '192.168.1.100',
    },
  ],
  '4': [
    {
      id: 'audit-4-1',
      blacklist_id: '4',
      action: 'CREATE',
      changed_by: 'user-3',
      changed_by_username: 'Pedro Ruiz',
      timestamp: '2024-09-08T11:00:00Z',
      ip_address: '192.168.1.110',
    },
  ],
  '5': [
    {
      id: 'audit-5-1',
      blacklist_id: '5',
      action: 'CREATE',
      changed_by: 'user-2',
      changed_by_username: 'Ana García',
      timestamp: '2024-08-22T10:00:00Z',
      ip_address: '192.168.1.105',
    },
    {
      id: 'audit-5-2',
      blacklist_id: '5',
      action: 'DELETE',
      changed_by: 'user-1',
      changed_by_username: 'Salvador',
      timestamp: '2024-11-01T15:00:00Z',
      ip_address: '192.168.1.100',
    },
  ],
}

// ========================================
// MOCK: Funciones de búsqueda y filtrado
// ========================================

export function filterMockData(
  entries: BlacklistEntry[],
  filters: {
    q?: string
    document?: string
    severity?: string
    status?: string
    from_date?: string
    to_date?: string
  }
): BlacklistEntry[] {
  let filtered = [...entries]

  // Filtrar por búsqueda general (nombre o documento)
  if (filters.q) {
    const query = filters.q.toLowerCase()
    filtered = filtered.filter(
      (entry) =>
        entry.guest_name.toLowerCase().includes(query) ||
        entry.document_number.toLowerCase().includes(query)
    )
  }

  // Filtrar por documento
  if (filters.document) {
    const doc = filters.document.toLowerCase()
    filtered = filtered.filter((entry) => entry.document_number.toLowerCase().includes(doc))
  }

  // Filtrar por gravedad
  if (filters.severity) {
    filtered = filtered.filter((entry) => entry.severity === filters.severity)
  }

  // Filtrar por estado
  if (filters.status && filters.status !== 'ALL') {
    filtered = filtered.filter((entry) => entry.status === filters.status)
  }

  // Filtrar por rango de fechas
  if (filters.from_date) {
    filtered = filtered.filter(
      (entry) => new Date(entry.check_in_date) >= new Date(filters.from_date!)
    )
  }

  if (filters.to_date) {
    filtered = filtered.filter(
      (entry) => new Date(entry.check_out_date) <= new Date(filters.to_date!)
    )
  }

  return filtered
}

export function paginateMockData(
  entries: BlacklistEntry[],
  page: number,
  limit: number
): BlacklistResponse {
  const total = entries.length
  const totalPages = Math.ceil(total / limit)
  const start = (page - 1) * limit
  const end = start + limit

  return {
    entries: entries.slice(start, end),
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_entries: total,
      per_page: limit,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
    filters_applied: {},
  }
}
