// middleware/authenticateToken.js

import { verifyToken } from '../services/tokenService.js'

/**
 * Middleware para verificar el token de acceso JWT.
 * ✅ Busca el token en cookies (HttpOnly) o en Authorization header
 * Prioridad: cookies > header (las cookies son más seguras)
 */
export function authenticateToken(req, res, next) {
  try {
    let token = null

    // 1️⃣ Primero intenta obtener de cookies (más seguro)
    token = req.cookies?.access_token

    // 2️⃣ Si no hay en cookies, buscar en Authorization header
    if (!token) {
      const authHeader = req.headers['authorization']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7) // Remover "Bearer "
      }
    }

    // console.log('[authenticateToken] Token presente:', !!token)
    // console.log('[authenticateToken] Fuente:', req.cookies?.access_token ? 'cookie' : 'header')

    if (!token) {
      return res.status(401).json({
        error: 'No autorizado, falta token',
        message:
          'Debes enviar el token en cookies o en el header Authorization',
      })
    }

    // Verifica el token usando tokenService
    const decoded = verifyToken(token)

    // Verifica que el payload contenga el id
    if (!decoded?.id) {
      return res
        .status(401)
        .json({ error: 'Token inválido: no contiene id de usuario' })
    }

    // Agrega la información del usuario al request
    req.user = decoded
    // console.log('[authenticateToken] Usuario autorizado:', decoded.username)
    next()
  } catch (error) {
    // Diferencia entre token expirado y token inválido
    let message = 'Token inválido'
    let statusCode = 401

    if (
      error.message === 'Token expirado' ||
      error.name === 'TokenExpiredError'
    ) {
      message = 'Token expirado'
    } else {
      console.log('[authenticateToken] Token inválido:', error.message)
    }

    return res.status(statusCode).json({ error: message })
  }
}
