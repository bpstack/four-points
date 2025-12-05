@roketid/windmill-react-ui es un framework de UI completo:

### ui-monospace

### Considerar algo así:

hotel-frontend/
├── app/ # App Router (pages, layouts, server components por defecto)
│ ├── layout.tsx # Root layout
│ ├── page.tsx # Landing page
│ ├── login/ # Ruta login
│ │ └── page.tsx
│ ├── dashboard/ # Ruta protegida
│ │ └── page.tsx
│ ├── consignas/
│ │ └── page.tsx
│ ├── users/
│ │ └── page.tsx
│ ├── parking/
│ │ └── page.tsx
│ └── api/ # Endpoints API (si usas Next como proxy)
│ ├── auth/
│ │ ├── login/route.ts
│ │ └── logout/route.ts
│ ├── consignas/route.ts
│ ├── users/route.ts
│ └── parking/route.ts
│
├── components/ # Componentes client puros y reutilizables
│ ├── forms/ # Formularios (LoginForm, ConsignaForm…)
│ ├── layout/ # Navbar, Sidebar, Footer
│ ├── theme/ # Botones de dark/light, ThemeProvider
│ └── ui/ # shadcn/ui (autogenerados)
│
├── features/ # (opcional) agrupación por dominio
│ ├── auth/ # Lógica de login/registro
│ │ ├── components/ # Forms, botones, etc
│ │ └── hooks/ # useLogin, useLogout…
│ ├── users/
│ └── consignas/
│
├── lib/ # utilidades
│ ├── api-client.ts # cliente fetch/axios con baseURL y cookies
│ ├── auth.ts # helpers (roles, cookies)
│ └── validations.ts # esquemas compartidos de zod
│
├── types/ # interfaces TypeScript
│ ├── auth.ts
│ ├── user.ts
│ └── parking.ts
│
├── styles/ # estilos globales
│ └── globals.css
├── public/ # imágenes, favicon
├── .env.local
├── tailwind.config.ts
├── tsconfig.json
└── package.json

### AUTH

📌 app/lib/login/authLogin.ts

Este archivo es una librería de cliente (frontend).
Define un objeto authLogin con métodos (login, logout, me) que tú puedes llamar desde tus componentes React/NextJS.
Cuando llamas, por ejemplo, authLogin.login(...), hace un fetch al endpoint interno de tu aplicación Next.js (/api/auth/login).
No habla directamente con tu backend en localhost:4000, sino que usa las rutas proxy que están en app/api/auth/....
En resumen: este archivo es un helper/SDK para el frontend → abstrae la llamada al backend real.

📌 app/api/auth/login/route.ts, logout/route.ts, me/route.ts

Estos archivos son rutas de API de Next.js (se ejecutan en el servidor de Next, no en el navegador).
Funcionan como proxy hacia tu backend real (http://localhost:4000).
La gracia:

El frontend nunca ve la URL real del backend.
Controlas qué cookies se reenvían y cómo se gestionan.
Seguridad: evitas exponer directamente las credenciales o CORS complicados.

Ejemplo de flujo en login:

El cliente (authLogin.login) hace fetch('/api/auth/login', ...).
El endpoint interno (app/api/auth/login/route.ts) recibe eso.
Este endpoint hace un fetch real al backend (http://localhost:4000/auth/login).
Reenvía la respuesta al cliente y copia las cookies (set-cookie).

🔑Diferencia clara:

authLogin.ts: no toca al backend directamente → solo pide a Next API Routes.
app/api/auth/...: sí hacen el fetch al backend real (localhost:4000).

👉 En otras palabras:

Frontend (React) → llama a authLogin.
authLogin → llama a /api/auth/....
Next API routes → hacen el fetch al backend (localhost:4000).
Backend real → valida login/logout/me y responde con cookies y datos.

📌 app/lib/login/useAuth.ts
useAuth.ts es un hook de React (frontend) que centraliza toda la lógica de autenticación para que cualquier componente lo pueda usar fácilmente.

1. Estado interno (useState)

user: guarda el usuario actual (o null si no hay sesión).
loading: indica si se está comprobando la sesión inicial.

2. Efecto inicial (useEffect)

Cuando el hook se monta, llama a authLogin.me() → esto va a /api/auth/me → backend.
Si responde con un usuario válido → lo guarda en user.
Si da error → deja user = null.
Al final siempre quita el loading.

👉 Esto es para saber si ya hay una sesión activa (por ejemplo, si había cookie de login).

3. login (con useCallback)

Llama a authLogin.login(username, password).
Si el login es correcto, actualiza user con el usuario devuelto.
Devuelve el usuario (útil para redirecciones después de login).

4. logout (con useCallback)

Llama a authLogin.logout().
Limpia user poniéndolo a null.

5. Devuelve un objeto con todo listo para usar en React:
   {
   user, // datos del usuario autenticado (o null)
   loading, // si aún está verificando la sesión inicial
   login, // función para logear
   logout, // función para salir
   isAuthenticated // boolean rápido para saber si hay sesión
   }

   📊 Flujo completo con este hook

App arranca → useAuth comprueba si ya hay sesión (authLogin.me()).
Si hay cookie válida → guarda el usuario.
Si no → user = null.
Cuando un componente llama login(...) → se hace login y actualiza user.
Cuando se llama logout() → se borra la cookie en backend y se limpia user.

👉 En resumen:
authLogin.ts son funciones sueltas.
useAuth.ts es el hook global que las usa para darte un estado reactivo de autenticación en React.

### Reorganizamos el proceso:

📌 1. LoginForm.tsx

Tipo: componente de UI (formulario).
Responsabilidad: mostrar inputs y botón de login.
Hook que usa: useLogin (para manejar el estado del login: loading, error).

Flujo:

Usuario mete credenciales → handleSubmit → llama a useLogin.login().
Si el login es correcto, muestra un alert (o redirige al dashboard).

👉 Es un componente tonto (presentacional), solo renderiza y delega lógica al hook.

📌 2. useLogin.ts

Tipo: custom hook.
Responsabilidad: encapsular la lógica del login/logout con estados locales (loading, error).
Hook que usa: directamente authLogin (el helper que llama a /api/auth/...).

Flujo:

login(username, password) → hace la llamada a authLogin.login.
Maneja estados (loading, error) y devuelve el usuario en caso de éxito.

👉 Este hook se usa solo en formularios de login. No mantiene sesión global, solo maneja la acción puntual de loguear.

📌 3. ProfileDropdown.tsx

Tipo: componente de UI (menú desplegable de usuario).
Responsabilidad: mostrar info del usuario logueado y acciones (Perfil, Configuración, Cerrar Sesión).

Props:

user: objeto usuario (de useAuth normalmente).
onLogout: callback para cerrar sesión.

Flujo:

Renderiza el nombre/rol/email.
Botones → navegar a rutas (/dashboard/profile, /settings).
Logout → llama a onLogout y redirige a /login.

👉 Es un componente visual reutilizable, recibe los datos y funciones desde fuera.

🔄 Cómo se conectan entre sí

LoginForm → usa useLogin para autenticar.
useLogin → usa authLogin para llamar al backend vía proxy.
ProfileDropdown → en una barra de navegación, recibe user y onLogout (generalmente de useAuth, el hook global de sesión).

📌 Dashboard/Layout.tsx Cierra el circulo; // app/dashboard/layout.tsx

Tipo: layout de Next.js (se aplica a todas las rutas bajo /dashboard).

Responsabilidad:
Proteger el área privada (/dashboard) → redirigir a /login si no hay usuario autenticado.
Renderizar la estructura común del dashboard: sidebar + header + contenido.
Gestionar cosas de UI global (tema, búsqueda, notificaciones, perfil).

**\*\*\*** ¿Quieres que te arme un ejemplo de AuthProvider para envolver todo tu <DashboardLayout> y que el hook useAuth sea compartido en toda la app, sin recalcular en cada layout?
📌 ¿Qué hace un AuthProvider?

Es un Context Provider de React que inicializa useAuth una sola vez.
Expone el user, login, logout, etc. a través de un contexto global.
Así, cualquier componente de la app puede acceder al estado de sesión sin recalcular ni volver a pedir datos al backend.

📌 1. Crear un nuevo archivo AuthContext.tsx

Ruta: app/lib/login/AuthContext.tsx

"use client"

import { createContext, useContext, ReactNode } from "react"
import { useAuth } from "./useAuth"

// El contexto guardará todo lo que devuelve useAuth
const AuthContext = createContext<ReturnType<typeof useAuth> | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
const auth = useAuth() // aquí inicializamos tu hook global UNA sola vez

return (
<AuthContext.Provider value={auth}>
{children}
</AuthContext.Provider>
)
}

// Hook para acceder al contexto en cualquier parte
export function useAuthContext() {
const ctx = useContext(AuthContext)
if (!ctx) throw new Error("useAuthContext must be used within AuthProvider")
return ctx
}

📌 2. Modificar tu layout raíz app/layout.tsx

Ahora envuelves toda tu aplicación con el AuthProvider.

Antes (simplificado):

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (

<html lang="es">
<body>{children}</body>
</html>
)
}

Después:

import { AuthProvider } from "@/app/lib/login/AuthContext"

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (

<html lang="es">
<body>
<AuthProvider>
{children}
</AuthProvider>
</body>
</html>
)
}

📌 3. Modificar app/dashboard/layout.tsx

Aquí es donde usabas useAuth directamente.
Ahora usas el contexto para no recalcularlo cada vez.

Antes:

import { useAuth } from '@/app/lib/login/useAuth'

const { user, loading, logout, isAuthenticated } = useAuth()

Después:

import { useAuthContext } from '@/app/lib/login/AuthContext'

const { user, loading, logout, isAuthenticated } = useAuthContext()

👉 El resto del layout (SideNav, ProfileDropdown, etc.) queda igual.

📌 4. Opcional: actualizar ProfileDropdown.tsx

Ahora mismo recibe user y onLogout como props.
Si quieres simplificar, puedes hacer que consuma directamente el contexto (useAuthContext).
Así no tienes que pasar props desde el layout.

Antes:

interface ProfileDropdownProps {
user: User
onLogout: () => void
}

export default function ProfileDropdown({ user, onLogout }: ProfileDropdownProps) {
...
}

Después (más limpio):

import { useAuthContext } from "@/app/lib/login/AuthContext"

export default function ProfileDropdown() {
const { user, logout } = useAuthContext()
...
}

Y en DashboardLayout ya no le pasas props:

<ProfileDropdown />

📌 5. ¿Qué NO cambia?

authLogin.ts: sigue igual.

useAuth.ts: sigue igual (pero ahora solo lo usa AuthProvider, no directamente los layouts/páginas).

useLogin.ts y LoginForm.tsx: siguen igual, porque son para el login puntual.

📌 6. Ventajas tras estos cambios

Una sola llamada a authLogin.me() al iniciar la app.
Estado de usuario único y consistente en toda la aplicación.
Ya no necesitas pasar user ni logout como props en todos lados → se leen directo del contexto.
Preparado para roles, permisos o incluso refresh tokens más adelante.

👉 Resumen de cambios concretos en archivos existentes:

app/layout.tsx: envolver con <AuthProvider>.
app/dashboard/layout.tsx: usar useAuthContext en lugar de useAuth.
ProfileDropdown.tsx: opcional, dejar de recibir user y onLogout como props → usar useAuthContext.

### solución temporal para poder entrar en la app sin hacer log in, tengo que implementarla

🔎 En tu ProfileDropdown

Mira la línea crítica:

const { user, logout } = useAuthContext()

// ⚠️ Si no hay usuario, no renderizar nada
if (!user) return null

👉 Esto es válido solo si siempre se leen los hooks ANTES del return.
El problema ocurre cuando tu DashboardLayout está en DEV_MODE sin user:

useAuthContext() devuelve algo incompleto (porque no estás logueado).

ProfileDropdown devuelve null demasiado pronto.

React detecta que se ejecutaron menos hooks que antes y te lanza ese error.

✅ Soluciones
Opción 1: Haz que ProfileDropdown maneje “modo dev” con un fake user
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === 'true'

const { user, logout } = useAuthContext()
const fakeUser = { username: "DevUser", role: "admin", email: "dev@local" }
const currentUser = DEV_MODE ? fakeUser : user

if (!currentUser) return null

👉 Así ProfileDropdown siempre renderiza de forma consistente, aunque no haya login real.

Opción 2: Maneja el fake user en el DashboardLayout y pásalo por props

En el layout:

const DEV_MODE = true
const fakeUser = { username: "DevUser", role: "admin", email: "dev@local" }
const currentUser = DEV_MODE ? fakeUser : user

Y en el JSX:

<ProfileDropdown user={currentUser} logout={logout} />

En ProfileDropdown.tsx, quitas el useAuthContext y usas props:

export default function ProfileDropdown({ user, logout }: { user: any, logout: () => void }) {
if (!user) return null
...
}

👉 Te pregunto:
¿Quieres que te lo deje todo centralizado en DashboardLayout (opción 2, más limpio) o prefieres que ProfileDropdown se auto-gestione con su propio fakeUser (opción 1)?

### Vamos a elaborar el logbooks system

En el layout tengo que:
Si quieres reducir líneas, podrías:

Extraer el modal a un componente separado (NewEntryModal.tsx) - ahorrarías ~150 líneas en el layout
Extraer la navegación del header (LogbookHeader.tsx) - ~100 líneas menos
Extraer la paginación de días (DayPagination.tsx) - ~50 líneas menos

### IMPORTANTE

- Modificación base de datos, 04/10/2025

-- Añadir 'unread' al ENUM de la columna action

ALTER TABLE logbook_history
MODIFY COLUMN action ENUM(
'create',
'update',
'delete',
'read',
'unread', -- ✅ AÑADIR este valor
'solve',
'reopen'
) NOT NULL;

Hay modificación de backend añadiendo nuevo endpoint , modificación del API route del frontend y terminada satisfactoriamente la funcionalidad de read/unread

### Posible Problema registro de logbooks y comentarios

Opción A: “Enviar el submit en el payload”
Opción B: “Delegarlo en un async state”

Escenario
App simple (pocas peticiones, sin recarga de datos)

Recomendación
fetch directo en el submit (payload)

Por qué
Menos código, más directo.

Escenario
App mediana/grande (muchos fetch, caching, reintentos, feedback de usuario)

Recomendación
Delegar en un async state (React Query, Zustand, RTK Query, etc.)

Por qué
Mantiene el código limpio, maneja automáticamente loading/error/success, permite revalidar datos fácilmente.

En resumen

“En payload” → haces la petición directamente al enviar el formulario.
✅ Simple, útil en formularios pequeños.
❌ Difícil de mantener si hay muchos endpoints o lógica compleja.

“Delegarlo en async state” → usas una capa que administra las peticiones, estados y cache.
✅ Escalable, más limpio y reactivo.
❌ Requiere configurar librerías o hooks adicionales.

########################################

### CAMBIAR FUENTE

// app/ui/fonts-design/fonts.ts
// app/ui/fonts-design/design-system.ts

// app/ui/fonts-design/fonts.helper.ts

En este último archivo, solo cambiar ACTIVE_FONTS

Es importante saber que según // tailwind.config.ts se puede añadir especificaciones como font-sans o font-display para especificar una u otra

### Autenticación implementada:

Timeline de tokens:
Login exitoso
↓
🟢 Access Token: 15 minutos
🟢 Refresh Token: 7 días
↓
Minuto 15: Access token expira
↓
❌ Request falla con 401
↓
✅ Auto-refresh usa refresh token (válido 7 días)
↓
🟢 Nuevo Access Token: 15 minutos más
🟢 Refresh Token: sigue válido
↓
... este ciclo se repite cada 15 min ...
↓
Día 7: Refresh token expira
↓
❌ Auto-refresh falla
↓
🚪 Redirigir a /login

💡 ¿Por qué 15 minutos si el refresh dura 8 horas?
Seguridad en capas:

Access token corto (15 min): Si lo roban, solo es útil 15 minutos
Refresh token largo (8 horas): Más seguro (HttpOnly), permite renovar sin molestar al usuario

Es como tener:

🔑 Llave temporal (access token) → se reemplaza cada 15 min
🏠 Llave maestra (refresh token) → dura 8 horas, genera llaves temporales - esta se puede cambiar sólo modificando el time del refresh token en backend archivo: // services/tokenService.js

### Para ver si utilizo una funcion en algun archivo del proyecto

Get-ChildItem -Recurse -Include _.ts, _.tsx -Path app | Select-String "ClientBody"

### Siempre que haya interacción del usuario necesitamos 'use client' - ejemplo: componente formulario login

### Siempre que haya datos, server component.

### NEGROS CAPAS #010409 #0D1117 #161B22
