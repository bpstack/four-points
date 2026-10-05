// types/express.d.ts

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        username: string
        email: string
        role: string
        // Public demo account, restricted by demoRestriction
        isDemo?: boolean
      }
    }
  }
}

export {}
