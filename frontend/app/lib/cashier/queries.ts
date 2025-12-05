// app/lib/cashier/queries.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/app/lib/apiClient'
import type {
  CashierDaily,
  CashierShift,
  CashierVoucher,
  InitializeDayDTO,
  UpdateShiftDTO,
  DenominationInput,
  PaymentInput,
  CreateVoucherDTO,
  VoucherStats,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export const cashierKeys = {
  all: ['cashier'] as const,
  daily: (date: string) => ['cashier', 'daily', date] as const,
  shifts: (date: string) => ['cashier', 'shifts', date] as const,
  shift: (id: number) => ['cashier', 'shift', id] as const,
  vouchers: () => ['cashier', 'vouchers'] as const,
  voucherStats: () => ['cashier', 'vouchers', 'stats'] as const,
}

// ═══════════════════════════════════════════════════════
// QUERIES - DAILY
// ═══════════════════════════════════════════════════════

export function useDailyDetails(date: string) {
  return useQuery({
    queryKey: cashierKeys.daily(date),
    queryFn: async () => {
      try {
        const response = await apiClient.get(`${API_BASE}/api/cashier/daily/${date}`)
        console.log('✅ Daily details response:', response)
        return response
      } catch (error: any) {
        console.error('❌ Error fetching daily:', error.message)

        // ✅ Si es 404, devolver null (día no inicializado)
        if (
          error.message?.includes('404') ||
          error.message?.includes('not found') ||
          error.message?.includes('Día no encontrado')
        ) {
          console.log('ℹ️ Día no inicializado (404 esperado)')
          return null
        }

        // ❌ Otros errores sí deben lanzarse
        throw error
      }
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  })
}

// ═══════════════════════════════════════════════════════
// QUERIES - SHIFTS
// ═══════════════════════════════════════════════════════

export function useShiftDetails(shiftId: number) {
  console.log('🔍 [useShiftDetails] Query initiated for shiftId:', shiftId)

  return useQuery({
    queryKey: cashierKeys.shift(shiftId),
    queryFn: async () => {
      console.log('🔍 [useShiftDetails] Fetching shift:', shiftId)
      const response = await apiClient.get(`${API_BASE}/api/cashier/shifts/${shiftId}`)
      console.log('✅ [useShiftDetails] Response:', response)
      return response
    },
    staleTime: 30 * 1000,
  })
}

// ═══════════════════════════════════════════════════════
// QUERIES - VOUCHERS
// ═══════════════════════════════════════════════════════

export function useVoucherStats() {
  return useQuery({
    queryKey: cashierKeys.voucherStats(),
    queryFn: () => apiClient.get(`${API_BASE}/api/cashier/vouchers/stats`),
    staleTime: 1 * 60 * 1000,
  })
}

// ═══════════════════════════════════════════════════════
// MUTATIONS - DAILY
// ═══════════════════════════════════════════════════════

export function useInitializeDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, data }: { date: string; data: InitializeDayDTO }) =>
      apiClient.post(`${API_BASE}/api/cashier/daily/${date}/initialize`, data),
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.daily(date) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.shifts(date) })
    },
  })
}

export function useCloseDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, notes }: { date: string; notes?: string }) =>
      apiClient.patch(`${API_BASE}/api/cashier/daily/${date}/close`, { notes }),
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.daily(date) })
    },
  })
}

// ═══════════════════════════════════════════════════════
// MUTATIONS - SHIFTS
// ═══════════════════════════════════════════════════════

export function useUpdateShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: number; data: UpdateShiftDTO }) =>
      apiClient.patch(`${API_BASE}/api/cashier/shifts/${shiftId}`, data),
    onSuccess: (_, { shiftId }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
      queryClient.invalidateQueries({ queryKey: ['cashier', 'daily'] })
    },
  })
}

export function useCloseShift() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (shiftId: number) =>
      apiClient.patch(`${API_BASE}/api/cashier/shifts/${shiftId}/close`, {}),
    onSuccess: (_, shiftId) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
      queryClient.invalidateQueries({ queryKey: ['cashier', 'daily'] })
    },
  })
}

export function useUpdateDenominations() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      shiftId,
      denominations,
    }: {
      shiftId: number
      denominations: DenominationInput[]
    }) =>
      apiClient.put(`${API_BASE}/api/cashier/shifts/${shiftId}/denominations`, { denominations }),
    onSuccess: (_, { shiftId }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
    },
  })
}

export function useUpdatePayments() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, payments }: { shiftId: number; payments: PaymentInput[] }) => {
      console.log('🔍 [Mutation] Enviando pagos:', { shiftId, payments }) // ✅ LOG
      return apiClient.put(`${API_BASE}/api/cashier/shifts/${shiftId}/payments`, { payments })
    },
    onSuccess: (response, { shiftId }) => {
      console.log('✅ [Mutation] Pagos guardados, invalidando queries') // ✅ LOG

      // ✅ Invalidar el shift específico
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })

      // ✅ Invalidar también el daily para actualizar totales
      queryClient.invalidateQueries({ queryKey: ['cashier', 'daily'] })

      console.log('✅ [Mutation] Queries invalidadas') // ✅ LOG
    },
    onError: (error) => {
      console.error('❌ [Mutation] Error:', error) // ✅ LOG
    },
  })
}

// ═══════════════════════════════════════════════════════
// MUTATIONS - VOUCHERS
// ═══════════════════════════════════════════════════════

export function useCreateVoucher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ shiftId, data }: { shiftId: number; data: CreateVoucherDTO }) =>
      apiClient.post(`${API_BASE}/api/cashier/shifts/${shiftId}/vouchers`, data),
    onSuccess: (_, { shiftId }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.shift(shiftId) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.vouchers() })
      queryClient.invalidateQueries({ queryKey: cashierKeys.voucherStats() })
    },
  })
}

export function useJustifyVoucher() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ voucherId, shiftId }: { voucherId: number; shiftId: number }) =>
      apiClient.patch(`${API_BASE}/api/cashier/vouchers/${voucherId}/justify`, {
        shift_id: shiftId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.vouchers() })
      queryClient.invalidateQueries({ queryKey: cashierKeys.voucherStats() })
      queryClient.invalidateQueries({ queryKey: ['cashier', 'daily'] })
    },
  })
}

// ✅ AÑADIDO: Mutation para reabrir día
export function useReopenDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ date, reason }: { date: string; reason?: string }) =>
      apiClient.patch(`${API_BASE}/api/cashier/daily/${date}/reopen`, { reason }),
    onSuccess: (_, { date }) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.daily(date) })
    },
  })
}

// ═══════════════════════════════════════════════════════
// QUERIES - REPORTS
// ═══════════════════════════════════════════════════════

export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ['cashier', 'reports', 'monthly', year, month],
    queryFn: () => apiClient.get(`${API_BASE}/api/cashier/reports/monthly/${year}/${month}`),
    staleTime: 5 * 60 * 1000, // 5 minutos
  })
}

export function useDashboardOverview() {
  return useQuery({
    queryKey: ['cashier', 'reports', 'dashboard'],
    queryFn: () => apiClient.get(`${API_BASE}/api/cashier/reports/dashboard`),
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

// ✅ CORREGIDO: useVouchersHistory
export function useVouchersHistory(filters?: {
  status?: string
  from_date?: string
  to_date?: string
  limit?: number
}) {
  return useQuery({
    queryKey: ['cashier', 'reports', 'vouchers-history', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.status) params.append('status', filters.status)
      if (filters?.from_date) params.append('from_date', filters.from_date)
      if (filters?.to_date) params.append('to_date', filters.to_date)
      if (filters?.limit) params.append('limit', filters.limit.toString())

      const response = await apiClient.get(
        `${API_BASE}/api/cashier/reports/vouchers-history?${params}`
      )
      // ✅ Retornar la respuesta directamente (ya viene parseada por apiClient)
      return response
    },
    staleTime: 2 * 60 * 1000, // 2 minutos
  })
}

// ═══════════════════════════════════════════════════════
// QUERIES - HISTORY & AUDIT
// ═══════════════════════════════════════════════════════

export function useHistoryLogs(filters?: {
  shift_id?: number
  action?: string
  from_date?: string
  to_date?: string
  changed_by?: string
  limit?: number
  offset?: number
}) {
  return useQuery({
    queryKey: ['cashier', 'history', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.shift_id) params.append('shift_id', filters.shift_id.toString())
      if (filters?.action) params.append('action', filters.action)
      if (filters?.from_date) params.append('from_date', filters.from_date)
      if (filters?.to_date) params.append('to_date', filters.to_date)
      if (filters?.changed_by) params.append('changed_by', filters.changed_by)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      return apiClient.get(`${API_BASE}/api/cashier/history?${params}`)
    },
    staleTime: 30 * 1000, // 30 segundos
  })
}

export function useHistoryStats(filters?: { from_date?: string; to_date?: string }) {
  return useQuery({
    queryKey: ['cashier', 'history', 'stats', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.from_date) params.append('from_date', filters.from_date)
      if (filters?.to_date) params.append('to_date', filters.to_date)

      return apiClient.get(`${API_BASE}/api/cashier/history/stats?${params}`)
    },
    staleTime: 1 * 60 * 1000, // 1 minuto
  })
}

export function useShiftHistory(shiftId: number) {
  return useQuery({
    queryKey: ['cashier', 'history', 'shift', shiftId],
    queryFn: () => apiClient.get(`${API_BASE}/api/cashier/history/shift/${shiftId}`),
    staleTime: 30 * 1000,
  })
}
