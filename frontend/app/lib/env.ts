// Centraliza las URLs de API para cliente y servidor
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
export const SERVER_API_BASE_URL = process.env.NEXT_SERVER_API_URL || API_BASE_URL
// Shows the demo button on the login page; the backend needs DEMO_MODE=true too
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
