// app/lib/blacklist/blacklistApi.ts
/**
 * Servicio API para el módulo Blacklist
 * Todas las llamadas HTTP al backend centralizadas aquí
 */

import { apiClient } from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'
import type { BlacklistResponse, BlacklistFilters, ImageUploadResponse } from './types'

const API_BASE = API_BASE_URL

export const blacklistApi = {
  // ========================================
  // OBTENER REGISTROS (con paginación y filtros)
  // ========================================
  getAll: async (filters?: BlacklistFilters): Promise<BlacklistResponse> => {
    const params = new URLSearchParams()

    if (filters?.q) params.append('q', filters.q)
    if (filters?.document) params.append('document', filters.document)
    if (filters?.severity) params.append('severity', filters.severity)
    if (filters?.status) params.append('status', filters.status)
    if (filters?.created_by) params.append('created_by', filters.created_by)
    if (filters?.from_date) params.append('from_date', filters.from_date)
    if (filters?.to_date) params.append('to_date', filters.to_date)
    if (filters?.page) params.append('page', filters.page.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    const url = `${API_BASE}/api/blacklist?${params.toString()}`
    return apiClient.get(url)
  },

  // ========================================
  // SUBIR IMAGEN A CLOUDINARY
  // ========================================
  uploadImage: async (file: File): Promise<ImageUploadResponse> => {
    const url = `${API_BASE}/api/blacklist/upload`

    const formData = new FormData()
    formData.append('image', file)

    return apiClient.postFormData(url, formData)
  },

  // ========================================
  // SUBIR MÚLTIPLES IMÁGENES
  // ========================================
  uploadImages: async (files: File[]): Promise<ImageUploadResponse[]> => {
    // Subir en paralelo
    const uploadPromises = files.map((file) => blacklistApi.uploadImage(file))
    return Promise.all(uploadPromises)
  },
}
