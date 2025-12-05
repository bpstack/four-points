// app/api/departments/route.ts
// ✅ USA apiClient con auto-refresh automático

import apiClient from '@/app/lib/apiClient'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api'

// =============== TIPOS ===============

export interface Department {
  id: number
  name: string
}

// =============== FUNCIONES DE API ===============

export const departmentsApi = {
  /**
   * Obtiene todos los departamentos
   */
  getAll: async (): Promise<Department[]> => {
    return apiClient.get(`${API_URL}/departments`)
  },

  /**
   * Obtiene un departamento por ID
   */
  getById: async (id: number): Promise<Department> => {
    return apiClient.get(`${API_URL}/departments/${id}`)
  },

  /**
   * Crea un nuevo departamento
   */
  create: async (data: { name: string }): Promise<Department> => {
    return apiClient.post(`${API_URL}/departments`, data)
  },

  /**
   * Actualiza un departamento existente
   */
  update: async (id: number, data: { name: string }): Promise<Department> => {
    return apiClient.put(`${API_URL}/departments/${id}`, data)
  },

  /**
   * Elimina un departamento
   */
  delete: async (id: number): Promise<{ message: string }> => {
    return apiClient.delete(`${API_URL}/departments/${id}`)
  },
}
