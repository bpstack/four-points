// services/tokenService.js

import jwt from 'jsonwebtoken'
import { SECRET_JWT_KEY } from '../config/config.js'

// ✅ CAMBIADO: Access token de 8h a 15 minutos
const ACCESS_TOKEN_EXPIRY = '15m'
const REFRESH_TOKEN_EXPIRY = '8h'

/**
 * Genera un token de acceso (corta duración)
 * @param {Object} user - Objeto con id, username y role
 * @returns {string} JWT token
 */
export function generateAccessToken(user) {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar Access Token')
  }

  const payload = {
    id: user.id,
    username: user.username || '',
    role: user.role || 'user',
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: ACCESS_TOKEN_EXPIRY })
}

/**
 * Genera un token de refresco (larga duración)
 * @param {Object} user - Objeto con id, username y role
 * @returns {string} JWT token
 */
export function generateRefreshToken(user) {
  if (!user || !user.id) {
    throw new Error('Usuario inválido para generar Refresh Token')
  }

  // ✅ IMPORTANTE: Incluir los mismos datos que el access token
  // para poder regenerarlo sin consultar la BD
  const payload = {
    id: user.id,
    username: user.username || '',
    role: user.role || 'user',
  }

  return jwt.sign(payload, SECRET_JWT_KEY, { expiresIn: REFRESH_TOKEN_EXPIRY })
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token a verificar
 * @returns {Object} Payload decodificado
 * @throws {Error} Si el token es inválido o expirado
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET_JWT_KEY)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado')
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido')
    }
    throw new Error('Error al verificar token')
  }
}
