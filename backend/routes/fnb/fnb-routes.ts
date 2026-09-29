import { Router } from 'express'
import multer from 'multer'
import { authenticateToken } from '../../middlewares/authenticateToken.js'
import { canAccessFnb } from '../../middlewares/roleCheck.js'
import { uploadPdf } from '../../controllers/fnb/fnb-upload.controller.js'
import {
  getMonthly,
  getDaily,
  getCategories,
  deleteDay,
} from '../../controllers/fnb/fnb-revenue.controller.js'
import { manualEntry } from '../../controllers/fnb/fnb-manual.controller.js'

const router = Router()

// memoryStorage: PDF parsed in RAM, never persisted to disk.
// No orphaned files, no cleanup job needed, ephemeral by design.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/octet-stream',
      'application/x-pdf',
      'binary/octet-stream',
    ]
    const ok = allowed.includes(file.mimetype) || file.originalname.toLowerCase().endsWith('.pdf')
    if (ok) cb(null, true)
    else cb(new Error(`Only PDF files allowed (got ${file.mimetype})`))
  },
})

router.use(authenticateToken)
router.use(canAccessFnb)

router.get('/categories', getCategories)
router.get('/monthly', getMonthly)
router.get('/daily', getDaily)
router.post('/upload', upload.single('pdf'), uploadPdf)
router.delete('/day/:date', deleteDay)
router.post('/entries', manualEntry)

export default router
