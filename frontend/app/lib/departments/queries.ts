// app/lib/departments/queries.ts
// ✅ USA apiClient con auto-refresh automático

import apiClient from '@/app/lib/apiClient'
import { API_BASE_URL } from '@/app/lib/env'
import type { Department } from './types'

const API_URL = API_BASE_URL

// =============== API CLIENT ===============

export const departmentsApi = {
  /**
   * Obtiene todos los departamentos
   */
  getAll: async (): Promise<Department[]> => {
    return apiClient.get(`${API_URL}/api/departments`)
  },

  /**
   * Obtiene un departamento por ID
   */
  getById: async (id: number): Promise<Department> => {
    return apiClient.get(`${API_URL}/api/departments/${id}`)
  },

  /**
   * Crea un nuevo departamento
   */
  create: async (data: { name: string }): Promise<Department> => {
    return apiClient.post(`${API_URL}/api/departments`, data)
  },

  /**
   * Actualiza un departamento existente
   */
  update: async (id: number, data: { name: string }): Promise<Department> => {
    return apiClient.put(`${API_URL}/api/departments/${id}`, data)
  },

  /**
   * Elimina un departamento
   */
  delete: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete(`${API_URL}/api/departments/${id}`)
  },
}
