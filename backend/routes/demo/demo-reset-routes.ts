// routes/demo/demo-reset-routes.ts
/**
 * Configuración → Demo (ADR-038). Solo con DEMO_MODE=true: el reinicio borra
 * los datos de todos los módulos, así que en cualquier otra instalación la
 * ruta no existe.
 */

import { Router, type Request, type Response, type NextFunction } from 'express'
import { getStatus, resetNow, saveSnapshot } from '../../controllers/demo/demo-reset-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { denyDemo } from '../../middlewares/demoRestriction.js'
import { isRealAdmin } from '../../middlewares/roleCheck.js'
import { isDemoMode } from '../../services/demo/demo-reset.service.js'

const router = Router()

router.use((_req: Request, res: Response, next: NextFunction) => {
  if (!isDemoMode()) {
    res.status(404).json({ error: 'Ruta no encontrada' })
    return
  }
  next()
})
router.use(authenticateToken)
// The demo account is an admin: it must not reset the demo for everyone
router.use(denyDemo)
router.use(isRealAdmin)

router.get('/status', getStatus)
router.post('/reset', resetNow)
router.post('/snapshot', saveSnapshot)

export default router
