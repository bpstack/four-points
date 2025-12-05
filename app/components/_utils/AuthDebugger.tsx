// // app/components/AuthDebugger.tsx
// // ⚠️ TEMPORAL - Solo para debugging, eliminar en producción

// Herramienta visual de depuración para sistema de autenticación

// 'use client'

// import { useEffect, useState } from 'react'
// import { useAuth } from '@/app/lib/login/useAuth'
// import { usePathname } from 'next/navigation'

// interface DebugInfo {
//   time: string
//   event: string
//   path: string
//   user: string | null
//   hasAccessToken: boolean
//   hasRefreshToken: boolean
//   tokenExpiry?: string
//   details?: any
// }

// export function AuthDebugger() {
//   const { user, isAuthenticated } = useAuth()
//   const pathname = usePathname()
//   const [debugLog, setDebugLog] = useState<DebugInfo[]>([])
//   const [isVisible, setIsVisible] = useState(false)

//   // Función para agregar logs
//   const addLog = (event: string, details?: any) => {
//     // NOTA: Las cookies HttpOnly NO son visibles desde JavaScript
//     // Esto es correcto por seguridad. Inferimos su presencia por el estado de auth
//     const hasAuth = !!user && isAuthenticated

//     // Para cookies HttpOnly, no podemos ver el contenido real
//     // Solo podemos inferir basándonos en si las API calls funcionan
//     let tokenStatus = 'HttpOnly (not visible)'
//     if (event.includes('401') || event.includes('Error')) {
//       tokenStatus = '❌ Expired/Invalid'
//     } else if (event.includes('refreshed')) {
//       tokenStatus = '✅ Just refreshed'
//     } else if (hasAuth) {
//       tokenStatus = '✅ Valid (inferred)'
//     } else {
//       tokenStatus = '⚠️ Unknown'
//     }

//     const info: DebugInfo = {
//       time: new Date().toLocaleTimeString(),
//       event,
//       path: pathname,
//       user: user?.username || null,
//       hasAccessToken: hasAuth, // Inferido del estado de auth
//       hasRefreshToken: hasAuth, // Inferido del estado de auth
//       tokenExpiry: tokenStatus,
//       details,
//     }

//     console.log('🔍 [AuthDebugger]', info)
//     setDebugLog((prev) => [...prev.slice(-19), info]) // Mantener últimos 20 logs
//   }

//   // Log inicial al montar
//   useEffect(() => {
//     addLog('Component mounted')
//   }, [])

//   // Log cuando cambia la ruta
//   useEffect(() => {
//     addLog('Route changed')
//   }, [pathname])

//   // Log cuando cambia el usuario
//   useEffect(() => {
//     if (user) {
//       addLog('User authenticated', { username: user.username })
//     } else {
//       addLog('User not authenticated')
//     }
//   }, [user])

//   // Check periódico cada 30 segundos
//   useEffect(() => {
//     const interval = setInterval(() => {
//       addLog('Periodic check')
//     }, 30000)

//     return () => clearInterval(interval)
//   }, [])

//   // Interceptar fetch para log de API calls
//   useEffect(() => {
//     const originalFetch = window.fetch

//     window.fetch = async (...args) => {
//       const [url, options] = args
//       const method = options?.method || 'GET'

//       // Solo loguear calls a /api/auth
//       if (typeof url === 'string' && url.includes('/api/auth')) {
//         addLog(`API ${method} ${url}`)

//         try {
//           const response = await originalFetch(...args)

//           // Log de respuestas importantes
//           if (!response.ok) {
//             addLog(`API Error ${response.status}`, { url, status: response.status })
//           } else if (url.includes('refresh-token')) {
//             addLog('Token refreshed successfully')
//           }

//           return response
//         } catch (error) {
//           const errorMessage = error instanceof Error ? error.message : 'Unknown error'
//           addLog('API Fetch Error', { url, error: errorMessage })
//           throw error
//         }
//       }

//       return originalFetch(...args)
//     }

//     return () => {
//       window.fetch = originalFetch
//     }
//   }, [])

//   if (!isVisible) {
//     return (
//       <button
//         onClick={() => setIsVisible(true)}
//         className="fixed bottom-4 right-4 z-50 bg-blue-500 text-white px-3 py-1 rounded text-xs"
//       >
//         Show Auth Debug
//       </button>
//     )
//   }

//   return (
//     <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-white p-4 rounded-lg max-w-2xl max-h-96 overflow-auto text-xs font-mono">
//       <div className="flex justify-between items-center mb-2">
//         <h3 className="font-bold">🔍 Auth Debugger</h3>
//         <button onClick={() => setIsVisible(false)} className="text-red-400 hover:text-red-300">
//           ✕
//         </button>
//       </div>

//       <div className="mb-2 p-2 bg-gray-800 rounded">
//         <div>Status: {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}</div>
//         <div>User: {user?.username || 'None'}</div>
//         <div>Path: {pathname}</div>
//       </div>

//       <div className="space-y-1">
//         {debugLog.map((log, i) => (
//           <div
//             key={i}
//             className={`
//             p-1 rounded
//             ${log.event.includes('Error') ? 'bg-red-900/50' : ''}
//             ${log.event.includes('refreshed') ? 'bg-green-900/50' : ''}
//             ${log.event.includes('Route') ? 'bg-blue-900/50' : ''}
//           `}
//           >
//             <span className="text-gray-400">{log.time}</span>
//             {' | '}
//             <span className="font-semibold">{log.event}</span>
//             {' | '}
//             <span className="text-xs">Status: {log.tokenExpiry}</span>
//             {log.details && (
//               <div className="text-gray-400 ml-4">{JSON.stringify(log.details, null, 2)}</div>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

// // app/components/AuthDebugger.tsx  version simple en la web
// 'use client'
// import { useAuth } from '@/app/lib/login/useAuth'
// import { useState, useEffect } from 'react'

// export function AuthDebugger() {
//   const { user, isAuthenticated } = useAuth()
//   const [lastRefresh, setLastRefresh] = useState<string>('')
//   const [apiCalls, setApiCalls] = useState<string[]>([])

//   useEffect(() => {
//     const originalFetch = window.fetch

//     window.fetch = async (...args) => {
//       const [url] = args

//       if (typeof url === 'string' && url.includes('/api/auth')) {
//         const time = new Date().toLocaleTimeString()
//         const method = args[1]?.method || 'GET'

//         const response = await originalFetch(...args)

//         const status = response.ok ? '✅' : '❌'
//         const log = `${time} ${status} ${method} ${url.split('/api')[1]} (${response.status})`

//         setApiCalls((prev) => [...prev.slice(-5), log])

//         if (url.includes('refresh-token') && response.ok) {
//           setLastRefresh(time)
//         }

//         return response
//       }

//       return originalFetch(...args)
//     }

//     return () => {
//       window.fetch = originalFetch
//     }
//   }, [])

//   return (
//     <div className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded text-xs font-mono max-w-md">
//       <div className="text-green-400">
//         Auth Status: {isAuthenticated ? `✅ ${user?.username}` : '❌ Not logged in'}
//       </div>
//       {lastRefresh && <div className="text-blue-400">Last token refresh: {lastRefresh}</div>}
//       <div className="mt-2 text-gray-400">
//         Recent API calls:
//         {apiCalls.map((call, i) => (
//           <div key={i} className="text-xs">
//             {call}
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }
// ```

// ### Lo que deberías ver funcionando correctamente:

// Con el token configurado a 1 minuto:
// ```
// Auth Status: ✅ sara
// Recent API calls:
// 14:54:00 ✅ GET /auth/me (200)
// 14:55:05 ❌ GET /auth/me (401)      ← Token expiró
// 14:55:05 ✅ POST /auth/refresh-token (200) ← Refresh automático
// 14:55:06 ✅ GET /auth/me (200)      ← Reintento exitoso
// Last token refresh: 14:55:05
