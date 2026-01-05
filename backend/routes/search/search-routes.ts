// routes/search/search-routes.ts
/**
 * Global Search Routes
 */

import { Router } from 'express'
import { search } from '../../controllers/search/search-controller.js'
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// All search routes require authentication
router.use(authenticateToken)

// GET /api/search?q=query
router.get('/', search)

export default router
