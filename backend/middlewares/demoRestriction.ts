// middlewares/demoRestriction.ts
/**
 * Restricciones de la cuenta demo pública (users.is_demo, ADR-038).
 *
 * La cuenta demo es un admin: ve y cambia todo lo que se reinicia cada día.
 * Se le bloquea lo que podría romper la app o tocar otras cuentas:
 * - en todas las rutas: subir ficheros (demoRestriction)
 * - en cada ruta sensible: denyDemo o denyDemoWrites
 *
 * El rol demo-admin (antiguo) mantiene su lista blanca hasta que se retire.
 */

import { Request, Response, NextFunction } from 'express'
import { DemoActivityRepository } from '../repositories/demo/demo-activity-repository.js'
import { logger } from '../config/logger.js'

// Rol demo antiguo, con su lista blanca de escrituras
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

function block(req: Request, res: Response): void {
  logBlockedAttempt(req, req.user?.id, req.user?.username || 'demo-user', req.originalUrl)

  res.status(403).json({
    success: false,
    error:
      'Acción no disponible en modo demo. Esta es una cuenta de demostración con funcionalidad limitada.',
    demo: true,
  })
}

// Uploads go to Cloudinary and the daily reset does not clean them; checking the
// header blocks every upload route before multer reads the body
function isMultipart(req: Request): boolean {
  return String(req.headers['content-type'] || '')
    .toLowerCase()
    .includes('multipart')
}

/**
 * Runs inside authenticateToken, on every authenticated request.
 *
 * - demo-admin (old demo role): only the whitelisted writes
 * - demo account (users.is_demo): no file uploads; the rest is limited per
 *   route with denyDemo and denyDemoWrites
 */
export function demoRestriction(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role === DEMO_ROLE) {
    if (req.method === 'GET' || isAllowedForDemo(req.method, req.originalUrl)) {
      next()
      return
    }
    block(req, res)
    return
  }

  if (req.user?.isDemo && isMultipart(req)) {
    block(req, res)
    return
  }

  next()
}

/**
 * Blocks the demo account from a route entirely (reads too). Declared on the
 * route itself, so it does not depend on how the URL is written.
 */
export function denyDemo(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.isDemo) {
    block(req, res)
    return
  }
  next()
}

/**
 * Lets the demo account read a route but not change anything through it.
 */
export function denyDemoWrites(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.isDemo && !['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    block(req, res)
    return
  }
  next()
}
