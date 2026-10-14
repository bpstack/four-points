// middlewares/authenticateToken.ts

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../services/auth/tokenService.js'
import { demoRestriction } from './demoRestriction.js'
import { demoWriteLimiter } from './rateLimiter.js'
import { logger } from '../config/logger.js'
import { ERROR_CODES } from '../config/error-codes.js'

/**
 * Middleware para verificar el token de acceso JWT.
 * ✅ Busca el token en cookies (HttpOnly) o en Authorization header
 * Prioridad: cookies > header (las cookies son más seguras)
 *
 * DEMO: Después de autenticar, también verifica restricciones demo.
 * Para eliminar esta funcionalidad, quitar la llamada a demoRestriction().
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
      res.status(401).json({ error: ERROR_CODES.UNAUTHORIZED, code: ERROR_CODES.UNAUTHORIZED })
      return
    }

    // Verifica el token usando tokenService
    const decoded = verifyToken(token)

    // Verifica que el payload contenga el id y sea un access token
    if (!decoded?.id) {
      res
        .status(401)
        .json({ error: ERROR_CODES.AUTH_TOKEN_INVALID, code: ERROR_CODES.AUTH_TOKEN_INVALID })
      return
    }

    if (decoded.type !== 'access') {
      res
        .status(401)
        .json({ error: ERROR_CODES.AUTH_TOKEN_INVALID, code: ERROR_CODES.AUTH_TOKEN_INVALID })
      return
    }

    // Agrega la información del usuario al request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: '', // No está en el token, se puede obtener de la BD si es necesario
      role: decoded.role,
      isDemo: decoded.demo === true,
    }
  } catch (error) {
    let code: string = ERROR_CODES.AUTH_TOKEN_INVALID

    if (error instanceof Error) {
      if (error.message === 'Token expirado' || error.name === 'TokenExpiredError') {
        code = ERROR_CODES.AUTH_TOKEN_EXPIRED
      } else {
        logger.debug({ err: error.message, path: req.path }, '[authenticateToken] invalid token')
      }
    }

    res.status(401).json({ error: code, code })
    return
  }

  // Demo account restrictions, outside the try: an error here is not a bad token
  demoRestriction(req, res, () => demoWriteLimiter(req, res, next))
}
