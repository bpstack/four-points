// app/lib/logbooks/queries.ts
// ✅ USA apiClient con auto-refresh automático

import apiClient from '@/app/lib/apiClient'
import type { LogbookEntry, LogbookComment } from './types'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000/api'

// =============== LOGBOOKS API ===============

export const logbooksApi = {
  // Obtener todos los logbooks
  getAllLogbooks: async () => {
    return apiClient.get(`${API_URL}/logbooks/all`)
  },

  // Crear un nuevo logbook
  createLogbook: async (data: {
    author_id: string
    message: string
    importance_level: string
    department_id: number
    date?: string
  }) => {
    return apiClient.post(`${API_URL}/logbooks`, data)
  },

  // Actualizar un logbook
  updateLogbook: async (
    id: number,
    data: {
      message?: string
      importance_level?: string
      department_id?: number
    }
  ) => {
    return apiClient.put(`${API_URL}/logbooks/${id}`, data)
  },

  // Obtener logbooks por prioridad
  getLogbooksByPriority: async (priority: string) => {
    return apiClient.get(`${API_URL}/logbooks/priority/${priority}`)
  },

  // Obtener logbooks por departamento
  getLogbooksByDepartment: async (departmentId: number) => {
    return apiClient.get(`${API_URL}/logbooks/department/${departmentId}`)
  },

  // Obtener logbooks por autor
  getLogbooksByAuthor: async (authorId: string) => {
    return apiClient.get(`${API_URL}/logbooks/author/${authorId}`)
  },

  // Obtener logbooks por día
  getLogbooksByDay: async (date: string) => {
    try {
      return await apiClient.get(`${API_URL}/logbooks/day/${date}`)
    } catch (error) {
      console.error('getLogbooksByDay failed:', error)
      throw error
    }
  },

  // Eliminar un logbook (soft-delete)
  deleteLogbook: async (id: number) => {
    return apiClient.delete(`${API_URL}/logbooks/${id}`)
  },

  // Listar logbooks eliminados (soft-deleted)
  getTrashedLogbooks: async () => {
    return apiClient.get(`${API_URL}/logbooks/trashed`)
  },

  // Obtener lectores
  getReaders: async (logbookId: number) => {
    return apiClient.get(`${API_URL}/logbooks/${logbookId}/readers`)
  },

  // Marcar logbook como leído
  markAsRead: async (logbookId: number) => {
    return apiClient.post(`${API_URL}/logbooks/${logbookId}/read`)
  },

  // Desmarcar como leído
  unmarkAsRead: async (logbookId: number) => {
    return apiClient.delete(`${API_URL}/logbooks/${logbookId}/read`)
  },

  // Marcar logbook como resuelto
  markAsSolved: async (logbookId: number) => {
    return apiClient.put(`${API_URL}/logbooks/${logbookId}/solve`)
  },

  // Marcar logbook como pendiente
  markAsPending: async (logbookId: number) => {
    return apiClient.put(`${API_URL}/logbooks/${logbookId}/pending`)
  },

  // Obtener usuarios que han leído un logbook
  getLogbookReaders: async (logbookId: number) => {
    return apiClient.get(`${API_URL}/logbooks/${logbookId}/readers`)
  },

  // Obtener usuario que ha resuelto un logbook
  getLogbookSolver: async (logbookId: number) => {
    return apiClient.get(`${API_URL}/logbooks/${logbookId}/solved`)
  },

  // Obtener historial de un logbook
  getLogbookHistory: async (logbookId: number) => {
    return apiClient.get(`${API_URL}/logbooks/${logbookId}/history`)
  },

  // Funciones para comentarios
  comments: {
    // Crear un comentario
    createComment: async (
      logbookId: number,
      data: {
        comment: string
        department_id: number
        importance_level: string
      }
    ) => {
      return apiClient.post(`${API_URL}/logbooks/${logbookId}/comments`, data)
    },

    // Obtener todos los comentarios de un logbook
    getComments: async (logbookId: number) => {
      return apiClient.get(`${API_URL}/logbooks/${logbookId}/comments`)
    },

    // Actualizar un comentario
    updateComment: async (
      logbookId: number,
      commentId: number,
      data: {
        comment?: string
        importance_level?: string
        department_id?: number
      }
    ) => {
      return apiClient.put(`${API_URL}/logbooks/${logbookId}/comments/${commentId}`, data)
    },

    // Eliminar un comentario (soft-delete)
    deleteComment: async (logbookId: number, commentId: number) => {
      return apiClient.delete(`${API_URL}/logbooks/${logbookId}/comments/${commentId}`)
    },

    // Obtener historial de un comentario
    getCommentHistory: async (logbookId: number, commentId: number) => {
      return apiClient.get(`${API_URL}/logbooks/${logbookId}/comments/${commentId}/history`)
    },
  },
}
