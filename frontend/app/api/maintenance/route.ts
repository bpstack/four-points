// app/api/maintenance/route.ts

import {
  mockReports,
  mockImages,
  mockHistory,
  MOCK_USERS,
  MOCK_USER_IDS,
} from '@/app/lib/maintenance/maintenance-mock'
import type {
  MaintenanceReport,
  MaintenanceImage,
  MaintenanceHistory,
  ReportWithDetails,
  ReportFilters,
  ReportFormData,
  ReportStatus,
  ReportPriority,
} from '@/app/lib/maintenance/maintenance'
import { v4 as uuidv4 } from 'uuid'

const API_DELAY = 300

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const maintenanceApi = {
  getAll: async (filters?: ReportFilters) => {
    await delay(API_DELAY)

    let filtered = [...mockReports].filter((r) => !r.is_deleted)

    if (filters?.status) {
      filtered = filtered.filter((r) => r.status === filters.status)
    }

    if (filters?.priority) {
      filtered = filtered.filter((r) => r.priority === filters.priority)
    }

    if (filters?.location_type) {
      filtered = filtered.filter((r) => r.location_type === filters.location_type)
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase()
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.location_description.toLowerCase().includes(search) ||
          r.room_number?.toLowerCase().includes(search)
      )
    }

    if (filters?.date_from) {
      filtered = filtered.filter((r) => r.report_date >= filters.date_from!)
    }

    if (filters?.date_to) {
      filtered = filtered.filter((r) => r.report_date <= filters.date_to!)
    }

    // Sort by date desc
    filtered.sort((a, b) => new Date(b.report_date).getTime() - new Date(a.report_date).getTime())

    return {
      success: true,
      data: filtered,
      count: filtered.length,
    }
  },

  getById: async (id: string): Promise<{ success: boolean; data: ReportWithDetails }> => {
    await delay(API_DELAY)

    const report = mockReports.find((r) => r.id === id)
    if (!report) {
      throw new Error('Reporte no encontrado')
    }

    const images = mockImages[id] || []
    const history = mockHistory[id] || []

    const reportWithDetails: ReportWithDetails = {
      ...report,
      images,
      history,
      created_by_name: MOCK_USERS[report.created_by as keyof typeof MOCK_USERS],
      assigned_to_name: report.assigned_to
        ? MOCK_USERS[report.assigned_to as keyof typeof MOCK_USERS]
        : undefined,
    }

    return {
      success: true,
      data: reportWithDetails,
    }
  },

  create: async (data: ReportFormData) => {
    await delay(API_DELAY)

    const newReport: MaintenanceReport = {
      id: uuidv4(),
      report_date: new Date().toISOString(),
      location_type: data.location_type,
      location_description: data.location_description,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: 'reported',
      room_number: data.room_number || null,
      room_out_of_service: data.room_out_of_service || null,
      assigned_to: data.assigned_to || null,
      assigned_type: data.assigned_type || null,
      external_company_name: data.external_company_name || null,
      external_contact: data.external_contact || null,
      started_at: null,
      resolved_at: null,
      closed_at: null,
      resolution_notes: null,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      created_by: MOCK_USER_IDS.admin,
      created_at: new Date().toISOString(),
      updated_by: null,
      updated_at: new Date().toISOString(),
    }

    mockReports.unshift(newReport)

    // Initialize history
    mockHistory[newReport.id] = [
      {
        id: 1,
        report_id: newReport.id,
        action: 'created',
        field_changed: null,
        old_value: null,
        new_value: null,
        notes: `Reporte creado: ${newReport.title}`,
        changed_by: newReport.created_by,
        changed_at: newReport.created_at,
        user_name: MOCK_USERS[MOCK_USER_IDS.admin],
      },
    ]

    // Initialize images
    mockImages[newReport.id] = []

    return {
      success: true,
      data: newReport,
      message: 'Reporte creado correctamente',
    }
  },

  update: async (id: string, data: Partial<ReportFormData>) => {
    await delay(API_DELAY)

    const index = mockReports.findIndex((r) => r.id === id)
    if (index === -1) {
      throw new Error('Reporte no encontrado')
    }

    const updatedReport = {
      ...mockReports[index],
      ...data,
      updated_at: new Date().toISOString(),
      updated_by: MOCK_USER_IDS.admin,
    }

    mockReports[index] = updatedReport

    return {
      success: true,
      data: updatedReport,
      message: 'Reporte actualizado correctamente',
    }
  },

  delete: async (id: string) => {
    await delay(API_DELAY)

    const index = mockReports.findIndex((r) => r.id === id)
    if (index === -1) {
      throw new Error('Reporte no encontrado')
    }

    mockReports[index] = {
      ...mockReports[index],
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: MOCK_USER_IDS.admin,
      updated_at: new Date().toISOString(),
    }

    return {
      success: true,
      message: 'Reporte eliminado correctamente',
    }
  },

  addImages: async (reportId: string, images: string[]) => {
    await delay(API_DELAY)

    const report = mockReports.find((r) => r.id === reportId)
    if (!report) {
      throw new Error('Reporte no encontrado')
    }

    if (!mockImages[reportId]) {
      mockImages[reportId] = []
    }

    images.forEach((base64Image, index) => {
      const newImage: MaintenanceImage = {
        id: mockImages[reportId].length + index + 1,
        report_id: reportId,
        file_name: `image-${Date.now()}-${index}.webp`,
        file_path: base64Image,
        file_size: Math.floor(Math.random() * 1000000) + 500000,
        mime_type: 'image/webp',
        uploaded_at: new Date().toISOString(),
        uploaded_by: MOCK_USER_IDS.admin,
        auto_delete_on_close: true,
      }
      mockImages[reportId].push(newImage)
    })

    return {
      success: true,
      message: 'Imágenes añadidas correctamente',
      count: images.length,
    }
  },

  // ✅ AÑADIDO: Actualizar estado del reporte
  updateStatus: async (id: string, status: ReportStatus, notes?: string) => {
    await delay(API_DELAY)

    const index = mockReports.findIndex((r) => r.id === id)
    if (index === -1) {
      throw new Error('Reporte no encontrado')
    }

    const oldStatus = mockReports[index].status
    const now = new Date().toISOString()

    mockReports[index] = {
      ...mockReports[index],
      status,
      started_at:
        status === 'in_progress' && !mockReports[index].started_at
          ? now
          : mockReports[index].started_at,
      resolved_at: status === 'completed' ? now : mockReports[index].resolved_at,
      closed_at: status === 'closed' || status === 'canceled' ? now : mockReports[index].closed_at,
      updated_at: now,
      updated_by: MOCK_USER_IDS.admin,
    }

    // Añadir al historial
    const historyEntry: MaintenanceHistory = {
      id: mockHistory[id] ? mockHistory[id].length + 1 : 1,
      report_id: id,
      action: 'status_changed',
      field_changed: 'status',
      old_value: oldStatus,
      new_value: status,
      notes: notes || `Estado cambiado de ${oldStatus} a ${status}`,
      changed_by: MOCK_USER_IDS.admin,
      changed_at: now,
      user_name: MOCK_USERS[MOCK_USER_IDS.admin],
    }

    if (!mockHistory[id]) mockHistory[id] = []
    mockHistory[id].unshift(historyEntry)

    return {
      success: true,
      data: mockReports[index],
      message: 'Estado actualizado correctamente',
    }
  },

  // ✅ AÑADIDO: Actualizar prioridad del reporte
  updatePriority: async (id: string, priority: ReportPriority) => {
    await delay(API_DELAY)

    const index = mockReports.findIndex((r) => r.id === id)
    if (index === -1) {
      throw new Error('Reporte no encontrado')
    }

    const oldPriority = mockReports[index].priority
    const now = new Date().toISOString()

    mockReports[index] = {
      ...mockReports[index],
      priority,
      updated_at: now,
      updated_by: MOCK_USER_IDS.admin,
    }

    // Añadir al historial
    const historyEntry: MaintenanceHistory = {
      id: mockHistory[id] ? mockHistory[id].length + 1 : 1,
      report_id: id,
      action: 'priority_changed',
      field_changed: 'priority',
      old_value: oldPriority,
      new_value: priority,
      notes: `Prioridad cambiada de ${oldPriority} a ${priority}`,
      changed_by: MOCK_USER_IDS.admin,
      changed_at: now,
      user_name: MOCK_USERS[MOCK_USER_IDS.admin],
    }

    if (!mockHistory[id]) mockHistory[id] = []
    mockHistory[id].unshift(historyEntry)

    return {
      success: true,
      data: mockReports[index],
      message: 'Prioridad actualizada correctamente',
    }
  },

  // ✅ AÑADIDO: Añadir notas de resolución
  addResolutionNotes: async (id: string, notes: string) => {
    await delay(API_DELAY)

    const index = mockReports.findIndex((r) => r.id === id)
    if (index === -1) {
      throw new Error('Reporte no encontrado')
    }

    const now = new Date().toISOString()

    mockReports[index] = {
      ...mockReports[index],
      resolution_notes: notes,
      updated_at: now,
      updated_by: MOCK_USER_IDS.admin,
    }

    // Añadir al historial
    const historyEntry: MaintenanceHistory = {
      id: mockHistory[id] ? mockHistory[id].length + 1 : 1,
      report_id: id,
      action: 'updated',
      field_changed: 'resolution_notes',
      old_value: null,
      new_value: notes,
      notes: 'Notas de resolución añadidas',
      changed_by: MOCK_USER_IDS.admin,
      changed_at: now,
      user_name: MOCK_USERS[MOCK_USER_IDS.admin],
    }

    if (!mockHistory[id]) mockHistory[id] = []
    mockHistory[id].unshift(historyEntry)

    return {
      success: true,
      data: mockReports[index],
      message: 'Notas añadidas correctamente',
    }
  },
}

export type { MaintenanceReport, ReportWithDetails, ReportFilters }
export { MOCK_USERS, MOCK_USER_IDS }
