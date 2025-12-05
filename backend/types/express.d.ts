// types/express.d.ts

import { IConciliationSummary } from '../models/conciliation.model.js'

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        username: string
        email: string
        role: string
      }
      conciliation?: IConciliationSummary
    }
  }
}

export {}
