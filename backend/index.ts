// index.ts

import express, { Request, Response, NextFunction } from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { PORT } from './config/config.js'

import authRoutes from './routes/auth/auth-routes.js'
import userRoutes from './routes/auth/user-routes.js'
import logbookRoutes from './routes/logbook/logbook-routes.js'
import parkingRoutes from './routes/parking/parking.routes.js'
import parkingStatsRoutes from './routes/parking/stats.routes.js'
import parkingBookingsRoutes from './routes/parking/bookings.routes.js'
import parkingAnalyticsRoutes from './routes/parking/analytics.routes.js'
import departmentsRoutes from './routes/departments/departments-routes.js'
import conciliationRoutes from './routes/conciliation/conciliation.routes.js'
import groupRoutes from './routes/group/group-routes.js'
import notificationRoutes from './routes/notifications/notifications-routes.js'
import cashierRoutes from './routes/cashier/cashier-routes.js'
import blacklistRoutes from './routes/blacklist/blacklist-routes.js'
import maintenanceRoutes from './routes/maintenance/maintenance-routes.js'

// ============================================
// EXPRESS APP
// ============================================

const app = express()

// ========================================
// CONFIGURACIÓN DE SEGURIDAD
// ========================================
app.disable('x-powered-by')

// CORS (antes de todo)
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
  })
)

// ========================================
// MIDDLEWARES GLOBALES
// ========================================
app.use(express.json())
app.use(cookieParser())

// ========================================
// MOTOR DE VISTAS (opcional, si usas EJS)
// ========================================
app.set('view engine', 'ejs')

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

// Rutas de analytics
app.use('/api/parking/stats/analytics', parkingAnalyticsRoutes)

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

app.use((err: HttpError, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error global:', err)

  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
  })
})

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})
