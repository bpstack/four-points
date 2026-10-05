// middlewares/rateLimiter.ts

import rateLimit from 'express-rate-limit'
import type { Request, Response } from 'express'
import { logger } from '../config/logger.js'
import { clientIpKey } from '../config/client-ip.js'

/**
 * Helper to get a consistent IP key (handles IPv6). Fails closed if Render's
 * proxy chain changes (config/client-ip.ts)
 */
function getIpKey(req: Request): string {
  const ip = clientIpKey(req)
  // Normalize IPv6 localhost to IPv4 format for consistency
  return ip === '::1' ? '127.0.0.1' : ip
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
    // Match utf8mb4_0900_ai_ci: 'Admin' and 'ádmin' are the same account
    const username = String(req.body?.username || '')
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
    const ip = getIpKey(req)
    return `login-${ip}-${username}`
  },
  handler: (req: Request, res: Response) => {
    logger.warn(
      {
        event: 'rate_limit_exceeded',
        kind: 'login',
        ip: getIpKey(req),
        username: req.body?.username,
      },
      '[SECURITY] login rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    })
  },
})

/**
 * Per-IP cap on failed logins, across all usernames (credential stuffing).
 * Only failures count: hotel staff share one public IP.
 */
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `login-ip-${getIpKey(req)}`,
  handler: (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind: 'login_ip', ip: getIpKey(req) },
      '[SECURITY] login IP rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    })
  },
})

/**
 * Rate limiter for the demo entry (POST /api/auth/demo), per IP
 */
export const demoLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => `demo-login-${getIpKey(req)}`,
  handler: (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind: 'demo_login', ip: getIpKey(req) },
      '[SECURITY] demo login rate limit exceeded'
    )
    res.status(429).json({
      error: 'Demasiadas entradas a la demo. Intenta de nuevo en 15 minutos.',
    })
  },
})

// The demo account is shared by every visitor, so its limits go by IP, plus a
// total cap where one Render instance is at stake (ADR-038)
const READ_METHODS = ['GET', 'HEAD', 'OPTIONS']

function demoLimitHandler(kind: string, error: string) {
  return (req: Request, res: Response) => {
    logger.warn(
      { event: 'rate_limit_exceeded', kind, ip: getIpKey(req) },
      '[SECURITY] demo rate limit exceeded'
    )
    res.status(429).json({ error })
  }
}

/**
 * Demo account writes, per IP
 */
export const demoWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => !req.user?.isDemo || READ_METHODS.includes(req.method),
  keyGenerator: (req: Request) => `demo-write-${getIpKey(req)}`,
  handler: demoLimitHandler(
    'demo_write',
    'Demasiados cambios en la demo. Intenta de nuevo en 15 minutos.'
  ),
})

/**
 * Schedule generation by the demo account: the solver loads OR-Tools on a
 * 512 MB instance and runs one at a time. Per IP, and in total
 */
const demoGeneratePerIp = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => !req.user?.isDemo,
  keyGenerator: (req: Request) => `demo-generate-${getIpKey(req)}`,
  handler: demoLimitHandler(
    'demo_generate',
    'Has generado demasiados horarios en la demo. Intenta de nuevo en una hora.'
  ),
})

const demoGenerateTotal = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: false,
  legacyHeaders: false,
  skip: (req: Request) => !req.user?.isDemo,
  keyGenerator: () => 'demo-generate-total',
  handler: demoLimitHandler(
    'demo_generate_total',
    'La demo ha generado demasiados horarios esta hora. Intenta de nuevo más tarde.'
  ),
})

export const demoGenerateLimiter = [demoGeneratePerIp, demoGenerateTotal]

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
      {
        event: 'rate_limit_exceeded',
        kind: 'password_change',
        userId: req.user?.id,
        ip: getIpKey(req),
      },
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
      {
        event: 'rate_limit_exceeded',
        kind: 'profile_update',
        userId: req.user?.id,
        ip: getIpKey(req),
      },
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
