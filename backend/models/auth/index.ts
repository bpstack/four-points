// models/auth/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// ENUMS
// ============================================

export type UserRole = 'admin' | 'recepcionista' | 'group-admin' | 'mantenimiento'

// ============================================
// DATABASE MODELS
// ============================================

export interface UserRow extends RowDataPacket {
  id: string
  username: string
  email: string
  password: string
  role_id: number
  is_active: number | boolean
  created_at: Date
  updated_at: Date | null
}

export interface UserWithRole extends RowDataPacket {
  id: string
  username: string
  email: string
  password?: string
  role: string
  is_active: number | boolean
  created_at: Date
  updated_at?: Date | null
}

export interface RoleRow extends RowDataPacket {
  id: number
  name: string
}

// ============================================
// ENTITIES (sin password para respuestas)
// ============================================

export interface User {
  id: string
  username: string
  email: string
  role: string
  is_active: number | boolean
  created_at: Date
  updated_at?: Date | null
}

// ============================================
// DTOs
// ============================================

export interface CreateUserDTO {
  username: string
  email: string
  password: string
  role?: string
}

export interface UpdateUserDTO {
  username?: string
  email?: string
  role?: string
}

export interface LoginDTO {
  username: string
  password: string
}

// ============================================
// AUTH RESPONSE TYPES
// ============================================

export interface AuthResponse {
  success: boolean
  user: User
  token?: string
  refreshToken?: string
}

export interface TokenPayload {
  id: string
  username: string
  role: string
  iat?: number
  exp?: number
}

export interface RefreshTokenResponse {
  success: boolean
  token: string
  refreshToken?: string
}

// ============================================
// COOKIE OPTIONS
// ============================================

export interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'strict' | 'lax' | 'none'
  path: string
  maxAge?: number
}

// ============================================
// REQUEST EXTENSIONS
// ============================================

export interface AuthenticatedUser {
  id: string
  username: string
  role: string
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult<T> {
  success: boolean
  data?: T
  error?: {
    issues: Array<{
      path: (string | number)[]
      message: string
    }>
  }
}

export interface ValidationErrors {
  [field: string]: string
}
