// app/lib/users/queries.ts

import type { LoginCredentials, RegisterData, UpdateUserData, AuthResponse } from './types'

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'

// =============== USERS API ===============

export const usersApi = {
  // Obtener todos los usuarios
  getAllUsers: async () => {
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        const message =
          res.status === 403 || res.status === 401
            ? 'Failed to fetch users. This option is only available for administrators.'
            : 'Error fetching users. Please try again later.'

        // Retorna un objeto de error controlado
        return { error: message }
      }

      return await res.json()
    } catch (err: any) {
      console.error('Error en getAllUsers:', err)
      return { error: 'Network error. Please check your connection.' }
    }
  },

  // Obtener usuario por ID
  getUserById: async (id: string) => {
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error('Failed to fetch user')
    return res.json()
  },

  // Obtener usuarios por rol
  getUsersByRole: async (role: string) => {
    const res = await fetch(`${API_URL}/api/users/role/${role}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error('Failed to fetch users by role')
    return res.json()
  },

  // Actualizar usuario
  updateUser: async (id: string, data: UpdateUserData) => {
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to update user')
    }

    return res.json()
  },

  // Eliminar usuario
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/api/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to delete user')
    }

    return res.json()
  },
}

// =============== AUTH API ===============

export const authApi = {
  // Login
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to login')
    }

    return res.json()
  },

  // Registro
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to register')
    }

    return res.json()
  },

  // Obtener datos del usuario autenticado
  getMe: async () => {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) throw new Error('Failed to fetch user data')
    return res.json()
  },

  // Refresh token
  refreshToken: async () => {
    const res = await fetch(`${API_URL}/api/auth/refresh-token`, {
      method: 'POST',
      credentials: 'include', // Para enviar cookies
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to refresh token')
    }

    return res.json()
  },

  // Logout
  logout: async () => {
    const res = await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Para enviar cookies
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.message || 'Failed to logout')
    }

    return res.json()
  },
}
