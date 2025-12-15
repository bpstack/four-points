// =========================================================
// PARKING ROUTES - simplificado
// =========================================================

import { Router } from 'express'

import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { isAdmin, excludeMantenimiento } from '../../middlewares/roleCheck.js'
import {
  listSpots,
  listAvailableSpots,
  manageVehicles,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
} from '../../controllers/parking/parking.controller.js'

const router = Router()

// =========================================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// El rol mantenimiento NO tiene acceso a este módulo
// =========================================================
router.use(authenticateToken)
router.use(excludeMantenimiento)

// =========================================================
// RUTAS DE PARKING
// =========================================================

router.get('/spots', listSpots)

router.get('/spots/available', listAvailableSpots)

router
  .route('/vehicles')
  .get(manageVehicles) // GET /vehicles
  .post(manageVehicles) // POST /vehicles

router.get('/vehicles/search', searchVehicles)

router.put('/vehicles/:id', updateVehicle) // PUT /vehicles/:id

router.delete('/vehicles/:id', isAdmin, deleteVehicle) // DELETE /vehicles/:id

export default router
