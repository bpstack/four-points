// index.ts

import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { PORT } from './config/config.js'
import { logServerInfo } from './config/startup-logger.js'
import { logger } from './config/logger.js'
import { apiLimiter } from './middlewares/rateLimiter.js'
import { noStore } from './middlewares/noStore.js'
import { corsMiddleware } from './config/cors.js'

import { CronService } from './services/cron/cron-service.js'
import { warmupSolver } from './services/scheduling/solver-client.js'
import authRoutes from './routes/auth/auth-routes.js'
import userRoutes from './routes/auth/user-routes.js'
import logbookRoutes from './routes/logbook/logbook-routes.js'
import parkingRoutes from './routes/parking/parking.routes.js'
import parkingStatsRoutes from './routes/parking/stats.routes.js'
import parkingBookingsRoutes from './routes/parking/bookings.routes.js'
import departmentsRoutes from './routes/departments/departments-routes.js'
import conciliationRoutes from './routes/conciliation/conciliation.routes.js'
import groupRoutes from './routes/group/group-routes.js'
import notificationRoutes from './routes/notifications/notifications-routes.js'
import cashierRoutes from './routes/cashier/cashier-routes.js'
import blacklistRoutes from './routes/blacklist/blacklist-routes.js'
import maintenanceRoutes from './routes/maintenance/maintenance-routes.js'
import activityRoutes from './routes/activity/activity-routes.js'
import messagesRoutes from './routes/messages/messages-routes.js'
import backofficeRoutes from './routes/backoffice/backoffice-routes.js'
import schedulingRoutes from './routes/scheduling/scheduling-routes.js'
import searchRoutes from './routes/search/search-routes.js'
import demoActivityRoutes from './routes/demo/demo-activity-routes.js'
import demoResetRoutes from './routes/demo/demo-reset-routes.js'
import checklistRoutes from './routes/checklist/checklist-routes.js'
import fnbRoutes from './routes/fnb/fnb-routes.js'

// ============================================
// EXPRESS APP
// ============================================

const app = express()

// Render chain (checked 2026-09-29): client -> Cloudflare -> Render LB (10.x) -> local proxy (::1).
// Trust exactly those 3 hops so req.ip is the client and a client-sent X-Forwarded-For is ignored.
// If the chain changes, the rate limits fail closed and log a warning (config/client-ip.ts).
app.set('trust proxy', 3)

// ========================================
// CONFIGURACIÓN DE SEGURIDAD
// ========================================
app.disable('x-powered-by')

// Helmet: cabeceras de seguridad HTTP (X-Frame-Options, HSTS, X-Content-Type-Options, etc.)
// CSP deshabilitado — API pura JSON, no sirve HTML ni assets
app.use(helmet({ contentSecurityPolicy: false }))

// CORS (antes de todo); also the CSRF defence (config/cors.ts)
app.use(corsMiddleware())

// ========================================
// MIDDLEWARES GLOBALES
// ========================================
app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())
app.use('/api', apiLimiter)
// Personal and financial data must not stay in browser or proxy caches
app.use('/api', noStore)

// ========================================
// RUTAS
// ========================================

// Ruta principal de health check
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
  })
})

// Rutas de autenticación
app.use('/api/auth', authRoutes)

// Rutas de gestión de usuarios
app.use('/api/users', userRoutes)

// Rutas de logbook
app.use('/api/logbooks', logbookRoutes)

// Rutas de parking
app.use('/api/parking', parkingRoutes)

// Rutas de stats
app.use('/api/parking/stats', parkingStatsRoutes)

// Rutas de bookings
app.use('/api/parking/bookings', parkingBookingsRoutes)

// Rutas de departamentos
app.use('/api/departments', departmentsRoutes)

// Rutas de conciliación
app.use('/api/conciliations', conciliationRoutes)

// Rutas de gestión de grupos
app.use('/api/groups', groupRoutes)

// Rutas de notificaciones
app.use('/api/notifications', notificationRoutes)

// Rutas de caja
app.use('/api/cashier', cashierRoutes)

// Rutas de blacklist
app.use('/api/blacklist', blacklistRoutes)

// Rutas de maintenance
app.use('/api/maintenance', maintenanceRoutes)

// Rutas de actividad (dashboard)
app.use('/api/activity', activityRoutes)

// Rutas de mensajeria interna
app.use('/api/messages', messagesRoutes)

// Rutas de backoffice (facturas, proveedores)
app.use('/api/backoffice', backofficeRoutes)

// Rutas de scheduling (horarios de personal)
app.use('/api/scheduling', schedulingRoutes)

// Rutas de búsqueda global
app.use('/api/search', searchRoutes)

// Rutas de actividad demo (solo admin)
app.use('/api/demo-activity', demoActivityRoutes)
// Demo reset and scheduling base (only with DEMO_MODE=true)
app.use('/api/demo', demoResetRoutes)
app.use('/api/checklists', checklistRoutes)
app.use('/api/fnb', fnbRoutes)

// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada (404)
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
  })
})

// Error handler global
interface HttpError extends Error {
  status?: number
}

app.use((err: HttpError, req: Request, res: Response, _next: NextFunction) => {
  if (err.status && err.status < 500) {
    res.status(err.status).json({ error: err.message })
    return
  }

  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error')

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  })
})

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, async () => {
  logServerInfo(PORT)
  CronService.start()
  warmupSolver()
})
