// config/cors.ts
/**
 * CORS, which is also the CSRF defence: a request whose Origin is not one of
 * ours is answered 403 before any route runs, including simple requests that
 * a browser sends without a preflight (a form POST, a multipart upload).
 * Requests without Origin pass: browsers always send it on cross-site writes,
 * and server-to-server calls or curl do not carry cookies from a victim.
 */

import cors from 'cors'
import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { logger } from './logger.js'

export function allowedOrigins(
  nodeEnv = process.env.NODE_ENV,
  frontendUrl = process.env.FRONTEND_URL
): string[] {
  return [
    ...(nodeEnv === 'production' ? [] : ['http://localhost:3000']),
    'https://four-points.stackbp.es',
    'https://four-points.vercel.app',
    'https://api.four-points.stackbp.es',
    'https://four-points.onrender.com',
    frontendUrl, // URL adicional si es necesario
  ].filter(Boolean) as string[]
}

export function corsMiddleware(origins = allowedOrigins()): RequestHandler {
  const handler = cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (Postman, server-to-server, mobile apps)
      if (!origin || origins.includes(origin)) {
        callback(null, true)
        return
      }
      logger.warn({ origin }, '[CORS] Blocked origin')
      // Must stay an error: callback(null, false) would let simple requests reach the routes
      callback(new Error('Origen no permitido'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err?: unknown) => {
      if (err) {
        res.status(403).json({ error: 'Origen no permitido' })
        return
      }
      next()
    })
  }
}
