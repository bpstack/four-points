// services/auth/tokenService.ts

import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from '../../config/config.js'
import type { TokenPayload } from '../../models/auth/index.js'

// Access token: 15 minutos
// Refresh token: 7 días
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '7d'
const JWT_ALGORITHM = 'HS256' as const

interface UserForToken {
  id: string
  username?: string
  role?: string
  type?: 'access' | 'refresh'
}

/**
 * Genera un token de acceso (corta duración)
 */
export function generateAccessToken(user: UserForToken): string {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar Access Token')
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    id: user.id,
    username: user.username || '',
    role: user.role || 'user',
    type: 'access',
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM })
}

/**
 * Genera un token de refresco (larga duración)
 */
export function generateRefreshToken(user: UserForToken): string {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar Refresh Token')
  }

  const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
    id: user.id,
    username: user.username || '',
    role: user.role || 'user',
    type: 'refresh',
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: JWT_ALGORITHM })
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, SECRET_JWT_KEY, { algorithms: [JWT_ALGORITHM] }) as TokenPayload
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado', { cause: error })
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido', { cause: error })
      }
    }
    throw new Error('Error al verificar token', { cause: error })
  }
}
