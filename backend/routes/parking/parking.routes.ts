// =========================================================
// PARKING ROUTES - simplificado
// =========================================================

import { Router } from 'express'

import { authenticateToken } from '../../middlewares/authenticateToken.js'
import {
  listSpots,
  listAvailableSpots,
  manageVehicles,
  updateVehicle,
  deleteVehicle,
  searchVehicles,
} from '../../controllers/parking/parking.controller.js'

import { isAdmin } from '../../middlewares/roleCheck.js'

const router = Router()

//
// Solo una ruta para todo
router.get('/spots', authenticateToken, listSpots)

//
// Solo una ruta para todo
router.get('/spots/available', authenticateToken, listAvailableSpots)

//
// Solo una ruta para todo
router
  .route('/vehicles')
  .get(authenticateToken, manageVehicles) // GET /vehicles
  .post(authenticateToken, manageVehicles) // POST /vehicles

// Añadir ANTES de la ruta /:id
router.get('/vehicles/search', searchVehicles)

router.put('/vehicles/:id', authenticateToken, updateVehicle) // PUT /vehicles/:id

router.delete('/vehicles/:id', authenticateToken, isAdmin, deleteVehicle) // DELETE /vehicles/:id

export default router
