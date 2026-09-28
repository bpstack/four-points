// middlewares/rateLimiter.ts

import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'
import { logger } from '../config/logger.js'

/**
 * Helper to get a consistent IP key (handles IPv6)
 */
function getIpKey(req: Request): string {
  // Normalize IPv6 localhost to IPv4 format for consistency
  const ip = req.ip || 'unknown'
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1'
  }
  // Remove IPv6 prefix if present
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7)
  }
  return ip
}

/**
 * Rate limiter for login attempts
 * Prevents brute force attacks on login endpoint
 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use IP + username combination as key for more granular limiting
  keyGenerator: (req: Request) => {
    const username = (req.body?.username || '').toLowerCase()
    const ip = getIpKey(req)
    return `login-${ip}-${username}`
  },
  handler: (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind: 'login', ip: getIpKey(req), username: req.body?.username },
      '[SECURITY] login rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    })
  },
})

/**
 * Rate limiter for password change attempts
 * Stricter limits to prevent brute force on password verification
 */
export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    error: 'Demasiados intentos de cambio de contraseña. Intenta de nuevo en 1 hora.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID from authenticated request (preferred) or IP as fallback
    if (req.user?.id) {
      return `password-user-${req.user.id}`
    }
    return `password-ip-${getIpKey(req)}`
  },
  handler: (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind: 'password_change', userId: req.user?.id, ip: getIpKey(req) },
      '[SECURITY] password change rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiados intentos de cambio de contraseña. Intenta de nuevo en 1 hora.',
    })
  },
})

/**
 * Rate limiter for profile update attempts
 * Moderate limits for profile changes
 */
export const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Demasiados intentos de actualización. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID from authenticated request (preferred) or IP as fallback
    if (req.user?.id) {
      return `profile-user-${req.user.id}`
    }
    return `profile-ip-${getIpKey(req)}`
  },
  handler: (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind: 'profile_update', userId: req.user?.id, ip: getIpKey(req) },
      '[SECURITY] profile update rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiados intentos de actualización. Intenta de nuevo en 15 minutos.',
    })
  },
})

/**
 * Rate limiter for refresh token endpoint
 * Prevents refresh token abuse (no revocation yet — Sprint 2 adds table)
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 refreshes per 15 minutes per IP
  message: {
    error: 'Demasiadas solicitudes de refresco. Intenta de nuevo en 15 minutos.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `refresh-${getIpKey(req)}`,
  handler: (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind: 'refresh', ip: getIpKey(req) },
      '[SECURITY] refresh rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiadas solicitudes de refresco. Intenta de nuevo en 15 minutos.',
    })
  },
})

/**
 * General API rate limiter
 * Prevents abuse of API endpoints
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per 15 minutes (budget alto para no romper UX)
  message: {
    error: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
