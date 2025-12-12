// index.js

import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { PORT } from './config/config.js'
import { getTodayMadrid, getNowMadrid } from './config/date-utils.js'

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

const app = express()

// console.log('=== DIAGNÓSTICO DE ZONA HORARIA ===')
// console.log(
//   'Server timezone:',
//   Intl.DateTimeFormat().resolvedOptions().timeZone
// )
// console.log('Server date (ISO):', new Date().toISOString())
// console.log(
//   'Server date (Local):',
//   new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
// )
// console.log('Fecha HOY Madrid (utils):', getTodayMadrid()) // ⭐ NUEVO
// console.log(
//   'Hora NOW Madrid (utils):',
//   getNowMadrid().format('YYYY-MM-DD HH:mm:ss')
// ) // ⭐ NUEVO
// console.log('===================================\n')

// ========================================
// CONFIGURACIÓN DE SEGURIDAD
// ========================================
app.disable('x-powered-by')

// ✅ CORS PRIMERO (antes de todo)
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'], // ✅ Agregar 'Cookie'
    exposedHeaders: ['Set-Cookie'], // ✅ CRÍTICO: Faltaba esto
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
app.get('/', (req, res) => {
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

// ... otras rutas
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

// ========================================
// MANEJO DE ERRORES
// ========================================

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.path,
  })
})

// Error handler global
app.use((err, req, res, next) => {
  console.error('Error global:', err)

  res.status(err.status || 500).json({
    error:
      process.env.NODE_ENV === 'production'
        ? 'Error interno del servidor'
        : err.message,
  })
})

// ========================================
// INICIAR SERVIDOR
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`)
})
