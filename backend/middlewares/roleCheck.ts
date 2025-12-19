// middlewares/roleCheck.ts

import { Request, Response, NextFunction } from 'express'

type RoleCheckMiddleware = (req: Request, res: Response, next: NextFunction) => void

/**
 * Verifica que el usuario tenga rol de administrador
 * Uso: Para rutas que SOLO admins pueden acceder
 * Nota: demo-admin tiene acceso visual pero sus escrituras están limitadas por demoRestriction
 */
export const isAdmin: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador',
    })
  }
}

/**
 * Verifica que el usuario sea el dueño del recurso O sea administrador
 * Uso: Para rutas donde un usuario puede ver/editar SU propio perfil
 * Nota: demo-admin tiene acceso visual como admin
 */
export const isOwnerOrAdmin: RoleCheckMiddleware = (req, res, next) => {
  const resourceUserId = req.params.id // ID del usuario en la URL
  const requestingUserId = req.user?.id // ID del usuario autenticado
  const userRole = req.user?.role?.toLowerCase()

  // Si es admin o demo-admin, tiene acceso total
  if (userRole === 'admin' || userRole === 'demo-admin') {
    next()
    return
  }

  // Si es el dueño del recurso, tiene acceso
  if (resourceUserId === requestingUserId) {
    next()
    return
  }

  // Si no es ni admin ni dueño, denegar acceso
  res.status(403).json({
    error: 'No tienes permiso para acceder a este recurso',
  })
}

/**
 * Verifica que el usuario pueda gestionar grupos
 * Uso: Para rutas de creación/edición/eliminación de grupos
 * Nota: demo-admin incluido para acceso visual
 */
export const canManageGroups: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'group-admin', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de gestor de grupos',
    })
  }
}

/**
 * Verifica que el usuario pueda ver grupos
 * Uso: Para rutas de consulta/lectura de grupos
 * Nota: demo-admin incluido para acceso visual
 */
export const canViewGroups: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'recepcionista', 'group-admin', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. No tienes permisos para ver grupos',
    })
  }
}

/**
 * Verifica que el usuario pueda gestionar caja
 * Uso: Para crear, editar, cerrar turnos, vales, etc.
 * Nota: demo-admin incluido para acceso visual
 */
export const canManageCashier: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'recepcionista', 'group-admin', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de admin, recepcionista o group-admin',
    })
  }
}

/**
 * Verifica que el usuario pueda ver reportes de caja
 * Uso: Para reportes, estadísticas, históricos completos
 * Nota: demo-admin incluido para acceso visual
 */
export const canViewReports: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador',
    })
  }
}

/**
 * Verifica que el usuario pueda acceder al módulo de mantenimiento
 * Uso: Para rutas de creación/edición/consulta de reportes de mantenimiento
 * Nota: TODOS los roles pueden acceder a mantenimiento (incluido demo-admin)
 */
export const canAccessMaintenance: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'recepcionista', 'group-admin', 'mantenimiento', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. No tienes permisos para acceder a mantenimiento',
    })
  }
}

/**
 * Excluye al rol mantenimiento de acceder a módulos generales
 * Uso: Para rutas de logbook, parking, blacklist, etc.
 * El rol mantenimiento SOLO puede acceder a /api/maintenance
 */
export const excludeMantenimiento: RoleCheckMiddleware = (req, res, next) => {
  const blockedRoles = ['mantenimiento']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (blockedRoles.includes(req.user.role.toLowerCase())) {
    res.status(403).json({
      error: 'Acceso denegado. Tu rol solo tiene acceso al módulo de mantenimiento',
    })
  } else {
    next()
  }
}

/**
 * Verifica que el usuario pueda acceder al módulo de backoffice
 * Uso: Para rutas de facturas, proveedores, etc.
 * SOLO admin y demo-admin pueden acceder
 */
export const canAccessBackoffice: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'demo-admin']

  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (allowedRoles.includes(req.user.role.toLowerCase())) {
    next()
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador para acceder al backoffice',
    })
  }
}

/**
 * Verifica que el usuario sea admin real (NO demo-admin)
 * Uso: Para operaciones de escritura en backoffice
 * demo-admin tiene acceso de solo lectura
 */
export const isRealAdmin: RoleCheckMiddleware = (req, res, next) => {
  if (!req.user?.role) {
    res.status(403).json({ error: 'No se pudo verificar el rol del usuario' })
    return
  }

  if (req.user.role.toLowerCase() === 'admin') {
    next()
  } else if (req.user.role.toLowerCase() === 'demo-admin') {
    res.status(403).json({
      error: 'Acceso de solo lectura. El rol demo-admin no puede realizar modificaciones',
    })
  } else {
    res.status(403).json({
      error: 'Acceso denegado. Se requiere rol de administrador',
    })
  }
}
