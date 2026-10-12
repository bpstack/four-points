// config/logger.ts
//
// Logger estructurado con pino.
//
// - Producción: JSON a stdout (Render lo captura como tal).
// - Desarrollo: pino-pretty para legibilidad humana.
// - Nivel desde env LOG_LEVEL; fallback: 'debug' en dev, 'info' en prod.
//
// Uso:
//   import { logger } from './config/logger.js'
//   logger.info({ userId, ip }, 'mensaje')
//   logger.warn({ route }, 'evento de seguridad')
//   logger.error({ err }, 'error inesperado')

import pino from 'pino'

const isDev = process.env.NODE_ENV !== 'production'
const level = process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')

const SECRET_KEYS = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken']

// Redactar campos sensibles si aparecen accidentalmente. pino has no
// recursive wildcard: secrets are hidden at the first three levels. The SQL
// of a failed db.query carries its values interpolated (texts, plates,
// hashes); err.code and err.message stay
export const redact = {
  paths: [
    ...SECRET_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
    'req.headers.authorization',
    'req.headers.cookie',
    '*.sql',
  ],
  censor: '[REDACTED]',
}

export const logger = pino({
  level,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  redact,
})
