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
  // Redactar campos sensibles si aparecen accidentalmente
  redact: {
    paths: [
      '*.password',
      '*.token',
      '*.refreshToken',
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
})
