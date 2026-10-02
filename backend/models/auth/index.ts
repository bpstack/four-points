// models/auth/index.ts

import { RowDataPacket } from 'mysql2'

// ============================================
// DATABASE MODELS
// ============================================

export interface UserWithRole extends RowDataPacket {
  id: string
  username: string
  email: string
  password?: string
  role: string
  is_active: number | boolean
  created_at: Date
  updated_at?: Date | null
  avatar_url?: string | null
  avatar_public_id?: string | null
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
  avatar_url?: string | null
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

export interface UpdateProfileDTO {
  username: string
  currentPassword: string
}

export interface UpdatePasswordDTO {
  currentPassword: string
  newPassword: string
}

// ============================================
// AUTH RESPONSE TYPES
// ============================================

export interface TokenPayload {
  id: string
  username: string
  role: string
  type: 'access' | 'refresh'
  iat?: number
  exp?: number
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
