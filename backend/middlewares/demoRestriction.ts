// middlewares/demoRestriction.ts
/**
 * Middleware para restringir acciones de escritura a usuarios demo.
 *
 * El usuario demo puede VER todo (igual que admin), pero solo puede
 * hacer escrituras específicas (whitelist).
 *
 * DISEÑO NO INVASIVO: Fácil de eliminar - solo quitar este archivo
 * y la línea en index.ts que lo importa.
 */

import { Request, Response, NextFunction } from 'express'
import { DemoActivityRepository } from '../repositories/demo/demo-activity-repository.js'
import { logger } from '../config/logger.js'

// Rol del usuario demo
const DEMO_ROLE = 'demo-admin'

/**
 * Rutas que el usuario demo SÍ puede usar (whitelist).
 * Formato: { method: 'POST|PATCH|PUT|DELETE', pattern: RegExp }
 */
const DEMO_ALLOWED_ROUTES: Array<{ method: string; pattern: RegExp }> = [
  // Auth - puede hacer logout
  { method: 'POST', pattern: /^\/api\/auth\/logout$/ },

  // Parking - puede crear reservas de prueba
  { method: 'POST', pattern: /^\/api\/parking\/bookings$/ },

  // Logbooks - puede agregar comentarios
  { method: 'POST', pattern: /^\/api\/logbooks\/\d+\/comments$/ },

  // Maintenance - puede crear reportes de prueba
  { method: 'POST', pattern: /^\/api\/maintenance$/ },
]

/**
 * Verifica si una ruta está en la whitelist para demo
 * Usa originalUrl para obtener la ruta completa (incluyendo /api/...)
 */
function isAllowedForDemo(method: string, originalUrl: string): boolean {
  // Quitar query string si existe
  const pathOnly = originalUrl.split('?')[0]
  return DEMO_ALLOWED_ROUTES.some(
    (route) => route.method === method && route.pattern.test(pathOnly)
  )
}

/**
 * Registra intentos bloqueados en la base de datos
 * Ejecuta de forma asíncrona sin bloquear la respuesta
 */
const SENSITIVE_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'confirmPassword'])

function sanitizeBodyForLog(body: unknown): string {
  if (!body || typeof body !== 'object') return JSON.stringify(body).substring(0, 500)
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    cleaned[k] = SENSITIVE_FIELDS.has(k) ? '[REDACTED]' : v
  }
  return JSON.stringify(cleaned).substring(0, 500)
}

function logBlockedAttempt(
  req: Request,
  userId: string | undefined,
  username: string,
  fullPath: string
): void {
  // Ejecutar sin await para no bloquear la respuesta
  DemoActivityRepository.logActivity({
    user_id: userId || null,
    username: username,
    method: req.method,
    route: fullPath,
    body_preview: sanitizeBodyForLog(req.body),
    ip_address: req.ip || req.socket.remoteAddress || null,
    user_agent: req.get('user-agent') || null,
    blocked: true,
  }).catch((error) => {
    // No fallar silenciosamente, pero tampoco bloquear el request
    logger.error({ err: error, route: fullPath }, '[demoRestriction] error logging blocked attempt')
  })
}

/**
 * Middleware que restringe escrituras para usuarios demo.
 *
 * - GET requests: siempre permitidos
 * - POST/PUT/PATCH/DELETE: solo si están en whitelist
 */
export function demoRestriction(req: Request, res: Response, next: NextFunction): void {
  // Si no hay usuario autenticado, dejar pasar (authenticateToken ya lo manejará)
  if (!req.user) {
    next()
    return
  }

  // Si no es usuario demo, dejar pasar sin restricciones
  if (req.user.role !== DEMO_ROLE) {
    next()
    return
  }

  // GET siempre permitido para demo (puede ver todo)
  if (req.method === 'GET') {
    next()
    return
  }

  // Verificar si la ruta está en whitelist (usar originalUrl para ruta completa)
  if (isAllowedForDemo(req.method, req.originalUrl)) {
    next()
    return
  }

  // Bloquear y registrar en BD
  logBlockedAttempt(req, req.user.id, req.user.username || 'demo-user', req.originalUrl)

  res.status(403).json({
    success: false,
    error:
      'Acción no disponible en modo demo. Esta es una cuenta de demostración con funcionalidad limitada.',
    demo: true,
  })
}
