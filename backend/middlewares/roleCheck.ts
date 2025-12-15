// middlewares/roleCheck.ts

import { Request, Response, NextFunction } from 'express'

type RoleCheckMiddleware = (req: Request, res: Response, next: NextFunction) => void

/**
 * Verifica que el usuario tenga rol de administrador
 * Uso: Para rutas que SOLO admins pueden acceder
 */
export const isAdmin: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin']

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
 */
export const isOwnerOrAdmin: RoleCheckMiddleware = (req, res, next) => {
  const resourceUserId = req.params.id // ID del usuario en la URL
  const requestingUserId = req.user?.id // ID del usuario autenticado
  const userRole = req.user?.role?.toLowerCase()

  // Si es admin, tiene acceso total
  if (userRole === 'admin') {
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
 */
export const canManageGroups: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'group-admin']

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
 */
export const canViewGroups: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'recepcionista', 'group-admin']

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
 */
export const canManageCashier: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'recepcionista', 'group-admin']

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
 */
export const canViewReports: RoleCheckMiddleware = (req, res, next) => {
  const allowedRoles = ['admin']

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
