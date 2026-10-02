// validations/notifications/notification-schemas.ts

import { z } from 'zod'

// An in-app path such as /dashboard/groups/12?tab=payments: one leading slash
// and no scheme, so "//evil.example" or "/\evil.example" (both read by the
// browser as another host) and "https://..." are rejected. The frontend
// opens it with router.push
export const internalLinkSchema = z
  .string()
  .trim()
  .max(500)
  .regex(/^\/(?![/\\])[^\s]*$/, 'El enlace debe ser una ruta interna de la aplicación')

const title = z.string().trim().min(1, 'El título es obligatorio').max(200)
// message is a TEXT column: 16,000 characters fit even at 4 bytes each
const message = z.string().trim().min(1, 'El mensaje es obligatorio').max(16000)
const priority = z.enum(['low', 'medium', 'high', 'urgent']).optional()
const scheduledFor = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Fecha programada no válida')
  .optional()
// Users are CHAR(36) UUIDs; duplicates would create the same notice twice
const userIds = z
  .array(z.string().uuid())
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, 'Hay usuarios repetidos')
  .optional()

// POST /api/notifications (GlobalNotificationModal)
export const generalNotificationSchema = z.object({
  title,
  message,
  priority,
  module: z.enum(['groups', 'parking', 'logbooks', 'system']).optional(),
  direct_link: internalLinkSchema.optional(),
  scheduled_for: scheduledFor,
  userIds,
})

// POST /api/groups/:id/notifications
export const groupNotificationSchema = z.object({
  title,
  message,
  priority,
  scheduled_for: scheduledFor,
  userIds,
})
