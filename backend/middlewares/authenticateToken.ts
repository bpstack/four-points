// middlewares/authenticateToken.ts

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth/tokenService.js'

/**
 * Middleware para verificar el token de acceso JWT.
 * ✅ Busca el token en cookies (HttpOnly) o en Authorization header
 * Prioridad: cookies > header (las cookies son más seguras)
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  try {
    let token: string | null = null

    // 1️⃣ Primero intenta obtener de cookies (más seguro)
    token = req.cookies?.access_token || null

    // 2️⃣ Si no hay en cookies, buscar en Authorization header
    if (!token) {
      const authHeader = req.headers['authorization']
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7) // Remover "Bearer "
      }
    }

    if (!token) {
      res.status(401).json({
        error: 'No autorizado, falta token',
        message: 'Debes enviar el token en cookies o en el header Authorization',
      })
      return
    }

    // Verifica el token usando tokenService
    const decoded = verifyToken(token)

    // Verifica que el payload contenga el id
    if (!decoded?.id) {
      res.status(401).json({ error: 'Token inválido: no contiene id de usuario' })
      return
    }

    // Agrega la información del usuario al request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: '', // No está en el token, se puede obtener de la BD si es necesario
      role: decoded.role,
    }

    next()
  } catch (error) {
    // Diferencia entre token expirado y token inválido
    let message = 'Token inválido'

    if (error instanceof Error) {
      if (error.message === 'Token expirado' || error.name === 'TokenExpiredError') {
        message = 'Token expirado'
      } else {
        console.log('[authenticateToken] Token inválido:', error.message)
      }
    }

    res.status(401).json({ error: message })
  }
}
