Te voy a dar ejemplos detallados de cada uno. Esto va a ser largo pero claro.

---

# **ESTRATEGIAS DE RENDERIZADO**

## **SSR (Server-Side Rendering)**

### Archivo: `app/dashboard/page.js` (App Router)

```javascript
// Esta es una página SSR porque hace fetch de datos en el servidor
// Cada vez que alguien pide esta página, el servidor ejecuta este código

async function DashboardPage() {
  // ❌ NUNCA HAGAS ESTO EN CLIENTE
  // ✅ Esto corre en el SERVIDOR, no en el navegador

  // Traemos datos del servidor (BD, API externa, etc)
  const response = await fetch('http://localhost:3000/api/stats', {
    cache: 'no-store', // 🔴 IMPORTANTE: "no-store" = NO cachear
    // Si quitaramos esto, Next.js cachearía por defecto
  })

  const stats = await response.json()

  // stats = { users: 150, revenue: $5000, orders: 25 }

  return (
    <div>
      <h1>Dashboard</h1>

      {/* Estos datos ya están generados en el HTML que envía el servidor */}
      {/* El navegador los ve instantáneamente, sin esperar JS */}
      <p>Usuarios: {stats.users}</p>
      <p>Ingresos: ${stats.revenue}</p>
      <p>Pedidos: {stats.orders}</p>
    </div>
  )
}

export default DashboardPage
```

**Qué sucede:**

```
Usuario → Pide /dashboard
           ↓
        Next.js (servidor)
           ↓
        Ejecuta DashboardPage()
           ↓
        Hace fetch a /api/stats
           ↓
        BD responde: { users: 150, revenue: 5000, orders: 25 }
           ↓
        Genera HTML: <h1>Dashboard</h1><p>Usuarios: 150</p>...
           ↓
        Envía ese HTML al navegador
           ↓
Usuario ve el dashboard completo (sin esperar JS)
```

**Diferencia sin `cache: 'no-store'`:**

```javascript
// Sin esto, Next.js por defecto cachea por 1 hora
const response = await fetch('http://localhost:3000/api/stats')

// Primer usuario pide /dashboard → fetch a BD → genera HTML → envía
// Segundo usuario (10 segundos después) pide /dashboard →
//   → Next.js sirve HTML en CACHÉ (no vuelve a hacer fetch)
// Tercer usuario (1.5 horas después) → ya pasó 1 hora → vuelve a hacer fetch
```

---

## **ISR (Incremental Static Regeneration)**

### Archivo: `app/blog/[slug]/page.js`

```javascript
// ISR combina lo mejor de SSG (estático) y SSR (fresco)

export const revalidate = 3600 // 🔴 CLAVE: Regenerar cada 3600 segundos (1 hora)

async function BlogPostPage({ params }) {
  // Traemos datos (durante BUILD y durante regeneración)
  const response = await fetch(`http://localhost:3000/api/posts/${params.slug}`)

  const post = await response.json()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      <time>{post.published}</time>
    </article>
  )
}

// Esto dice cuáles posts existen (necesario para dynamic routes)
export async function generateStaticParams() {
  // En build time, trae todos los posts
  const posts = await fetch('http://localhost:3000/api/posts').then((r) => r.json())

  // Retorna array de { slug: "post-1" }, { slug: "post-2" }, etc
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default BlogPostPage
```

**Qué sucede:**

```
BUILD TIME (npm run build):
  ↓
  generateStaticParams() trae todos los posts: ["post-1", "post-2", "post-3"]
  ↓
  Para cada slug, ejecuta BlogPostPage({ params: { slug } })
  ↓
  Genera /blog/post-1.html, /blog/post-2.html, /blog/post-3.html
  ↓
  Los guarda en disco como archivos estáticos

CUANDO USUARIO PIDE /blog/post-1:
  ↓
  Servidor sirve el HTML estático (⚡ VELOCIDAD EXTREMA)

DESPUÉS DE 1 HORA (revalidate = 3600):
  ↓
  Si alguien pide /blog/post-1 de nuevo después de 1 hora
  ↓
  Next.js regenera en BACKGROUND (en paralelo)
  ↓
  Mientras tanto, sigue sirviendo HTML viejo
  ↓
  Una vez listo, cambia al HTML nuevo

SI CREAS UN POST NUEVO:
  ↓
  Esperas 1 hora (el revalidate)
  ↓
  O haces request a: POST /api/revalidate?secret=tutoken&slug=nuevo-post
  ↓
  Next.js regenera ese post inmediatamente
```

---

## **SSG (Static Site Generation)**

### Archivo: `app/about/page.js`

```javascript
// SSG puro: genera HTML una sola vez en build time

export const revalidate = false // 🔴 NUNCA regenerar
// O simplemente no pones revalidate

async function AboutPage() {
  // Esto corre UNA SOLA VEZ durante `npm run build`
  const response = await fetch('http://localhost:3000/api/about-info')
  const aboutInfo = await response.json()

  return (
    <div>
      <h1>Sobre nosotros</h1>
      <p>{aboutInfo.description}</p>
      <p>Equipo: {aboutInfo.teamSize} personas</p>
    </div>
  )
}

export default AboutPage
```

**Qué sucede:**

```
npm run build:
  ↓
  AboutPage() se ejecuta UNA VEZ
  ↓
  Genera /about.html
  ↓
  Ese archivo se queda en disco para siempre
  ↓
  Todos los usuarios reciben exactamente el mismo HTML

Cambias BD (descripción, equipo):
  ↓
  NADA CAMBIA para los usuarios
  ↓
  Necesitas hacer `npm run build` de nuevo
  ↓
  Ahí sí se regenera
```

---

## **CSR (Client-Side Rendering)**

### Archivo: `app/products/page.js`

```javascript
'use client' // 🔴 IMPORTANTE: Esto es un Client Component

import { useState, useEffect } from 'react'

function ProductsPage() {
  const [products, setProducts] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Este código corre en el NAVEGADOR, no en servidor
  useEffect(() => {
    // El usuario aún no ve nada, el fetch está en progreso

    fetch('/api/products')
      .then((response) => response.json())
      .then((data) => {
        // ✅ Fetch terminado
        setProducts(data)
        setIsLoading(false)
      })
      .catch((err) => {
        // ❌ Error en el fetch
        setError(err.message)
        setIsLoading(false)
      })
  }, []) // [] = corre una sola vez cuando el componente monta

  // Mientras isLoading = true, mostrar esto
  if (isLoading) {
    return <div>Cargando productos...</div>
  }

  // Si hubo error, mostrar esto
  if (error) {
    return <div>Error: {error}</div>
  }

  // Si products no es null, mostrar la lista
  return (
    <div>
      <h1>Productos</h1>
      <ul>
        {products.map((product) => (
          <li key={product.id}>
            {product.name} - ${product.price}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProductsPage
```

**Qué sucede:**

```
Usuario pide /products:
  ↓
  Servidor envía:
  <html>
    <body>
      <div id="root"></div>
      <script src="/app.js" /> (miles de KB de JavaScript)
    </body>
  </html>
  ↓
  Navegador descarga app.js (toma TIEMPO ⏳)
  ↓
  JavaScript corre: ReactDOM.render(<ProductsPage />)
  ↓
  ProductsPage() renderiza pero products = null
  ↓
  Renderiza: "Cargando productos..."
  ↓
  useEffect corre: fetch('/api/products')
  ↓
  Espera respuesta...
  ↓
  Respuesta llega: setProducts(data)
  ↓
  Componente se re-renderiza
  ↓
  Ahora muestra la lista
```

**Timeline visual:**

```
SSR:     [Espera fetch] → HTML listo → Usuario ve contenido
CSR:     HTML vacío → [Descarga JS] → [Espera fetch] → Usuario ve contenido

         SSR es más rápido al principio
         CSR es mejor para interactividad después
```

---

# **LIBRERÍAS DE ESTADO GLOBAL**

## **Zustand**

### Paso 1: Crear el store

Archivo: `store/userStore.js`

```javascript
import { create } from 'zustand'

// create() crea un hook personalizado
const useUserStore = create((set) => ({
  // ESTADO INICIAL
  user: null,
  isAuthenticated: false,
  theme: 'light',

  // FUNCIONES que modifican el estado
  // set es la función que modifica el estado

  // login({ email, password }) → pone el usuario en el store
  login: (userData) =>
    set({
      user: userData,
      isAuthenticated: true,
    }),

  // logout() → limpia el usuario
  logout: () =>
    set({
      user: null,
      isAuthenticated: false,
    }),

  // toggleTheme() → cambia tema
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),

  // setUser(userData) → actualiza solo el usuario
  setUser: (userData) => set({ user: userData }),
}))

export default useUserStore
```

**Explicación:**

```javascript
const useUserStore = create((set) => ({
  // ↑ (set) es una función que Next.js proporciona
  // Úsala para cambiar el estado

  user: null,
  // ↑ Este es el estado inicial. Todos los componentes ven esto

  login: (userData) =>
    set({
      user: userData,
      isAuthenticated: true,
    }),
  // ↑ login() es una función.
  //   Cuando la llamas, set() REEMPLAZA el estado con esto
  //   set({ user: userData }) = "cambia user a userData"

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
  // ↑ Esta versión de set() recibe (state) como parámetro
  //   Para leer el estado actual antes de cambiar
  //   state.theme te da el tema ACTUAL
  //   Luego lo cambias al opuesto
}))
```

### Paso 2: Usar el store en componentes

Archivo: `app/components/Header.js`

```javascript
'use client'

import useUserStore from '@/store/userStore'

export function Header() {
  // Hook que se conecta al store
  // Cada vez que el store cambia, este componente se re-renderiza
  const { user, isAuthenticated, theme, toggleTheme, logout } = useUserStore()

  return (
    <header style={{ background: theme === 'dark' ? '#333' : '#fff' }}>
      {isAuthenticated ? (
        // Usuario está logueado
        <div>
          <p>Hola, {user.name}!</p>

          <button onClick={toggleTheme}>Cambiar a {theme === 'light' ? 'oscuro' : 'claro'}</button>
          {/* ↑ Cuando hace click, toggleTheme() se ejecuta
              toggleTheme modifica theme en el store
              El componente se re-renderiza mostrando el nuevo tema */}

          <button onClick={logout}>Cerrar sesión</button>
          {/* ↑ Cuando hace click, logout() se ejecuta
              Limpia user e isAuthenticated
              El componente se re-renderiza sin el usuario */}
        </div>
      ) : (
        // Usuario NO está logueado
        <p>Por favor, inicia sesión</p>
      )}
    </header>
  )
}
```

### Paso 3: Cambiar el estado desde otro componente

Archivo: `app/components/LoginForm.js`

```javascript
'use client'

import { useState } from 'react'
import useUserStore from '@/store/userStore'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // Obtenemos la función login del store
  const login = useUserStore((state) => state.login)
  // ↑ Este paréntesis (state) => state.login es selector
  //   Le dice: "Dame SOLO la función login del store"
  //   NO necesito user, theme, etc.

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Hacemos fetch a nuestro backend
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })

    const userData = await response.json()
    // userData = { id: 1, name: "Juan", email: "juan@mail.com" }

    // AQUÍ LLAMAMOS login() del store
    login(userData)
    // ↑ Esto ejecuta: set({ user: userData, isAuthenticated: true })
    //   Todos los componentes que usan useUserStore se re-renderizan
    //   El Header ahora muestra "Hola, Juan!"
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
      />
      <button type="submit">Iniciar sesión</button>
    </form>
  )
}
```

**Flujo completo:**

```
Usuario escribe email y contraseña
  ↓
Click "Iniciar sesión"
  ↓
handleSubmit() corre
  ↓
fetch a /api/login
  ↓
Backend responde: { id: 1, name: "Juan", email: "juan@mail.com" }
  ↓
login(userData) se ejecuta
  ↓
set({ user: userData, isAuthenticated: true }) se ejecuta
  ↓
El store cambia
  ↓
TODOS los componentes que usan useUserStore se re-renderizan:
  - Header ve user = Juan, isAuthenticated = true
  - LoginForm ve isAuthenticated = true (podría mostrar "Ya estás logueado")
  - Sidebar ve user = Juan (muestra su nombre)
```

---

## **Redux**

### Paso 1: Crear el reducer

Archivo: `store/counterSlice.js`

```javascript
import { createSlice } from '@reduxjs/toolkit'

// createSlice() automatiza muchas cosas de Redux
const counterSlice = createSlice({
  name: 'counter', // Nombre del slice

  initialState: {
    value: 0,
    // ↑ Estado inicial: el contador empieza en 0
  },

  reducers: {
    // Estos son los reducers (funciones que modifican estado)

    increment: (state) => {
      // ⚠️ En Redux NO modifícas directamente
      // Redux Toolkit usa Immer bajo el capó
      // que permite mutación directa
      state.value += 1
      // ↑ Esto parece mutación pero en realidad crea un nuevo state
    },

    decrement: (state) => {
      state.value -= 1
    },

    incrementByAmount: (state, action) => {
      // action contiene los datos que se pasan desde el componente
      // action.payload = el número que pasamos
      state.value += action.payload
      // Ejemplo: dispatch(incrementByAmount(5)) → payload = 5
    },

    reset: (state) => {
      state.value = 0
    },
  },
})

// Exportas las acciones automáticamente generadas
export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions

// Exportas el reducer para createStore
export default counterSlice.reducer
```

**Explicación:**

```javascript
reducers: {
  incrementByAmount: (state, action) => {
    state.value += action.payload
  }
}

// Redux genera automáticamente:
// const action = { type: 'counter/incrementByAmount', payload: 5 }
// export const incrementByAmount = (payload) => ({
//   type: 'counter/incrementByAmount',
//   payload
// })

// Es decir: incrementByAmount(5) crea una action automáticamente
```

### Paso 2: Crear el store

Archivo: `store/index.js`

```javascript
import { configureStore } from '@reduxjs/toolkit'
import counterReducer from './counterSlice'

const store = configureStore({
  reducer: {
    counter: counterReducer,
    // ↑ Decimos: "En la rama 'counter' del estado, usa counterReducer"
    // El estado será:
    // {
    //   counter: { value: 0 }
    // }
  },
})

export default store
```

### Paso 3: Envolver la app

Archivo: `app/layout.js`

```javascript
import { Provider } from 'react-redux'
import store from '@/store'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* Provider pone el store disponible a TODOS los componentes */}
        <Provider store={store}>{children}</Provider>
      </body>
    </html>
  )
}
```

### Paso 4: Usar en componentes

Archivo: `app/components/Counter.js`

```javascript
'use client'

import { useSelector, useDispatch } from 'react-redux'
import { increment, decrement, incrementByAmount } from '@/store/counterSlice'

export function Counter() {
  // useSelector extrae datos del store
  const count = useSelector((state) => state.counter.value)
  // ↑ (state) => state.counter.value es un selector
  //   Le dices qué parte del estado quieres
  //   (state) recibe el estado completo: { counter: { value: 0 } }
  //   retorna: state.counter.value = 0

  // useDispatch permite disparar acciones
  const dispatch = useDispatch()
  // ↑ dispatch es la función para ejecutar acciones

  return (
    <div>
      <p>Contador: {count}</p>

      <button onClick={() => dispatch(increment())}>Aumentar</button>
      {/* ↑ dispatch(increment()) hace:
          1. increment() crea action: { type: 'counter/increment' }
          2. Redux ejecuta el reducer increment
          3. El reducer hace: state.value += 1
          4. El estado del store cambia: { counter: { value: 1 } }
          5. useSelector detecta el cambio
          6. El componente se re-renderiza con count = 1 */}

      <button onClick={() => dispatch(decrement())}>Disminuir</button>

      <button onClick={() => dispatch(incrementByAmount(10))}>Sumar 10</button>
      {/* ↑ dispatch(incrementByAmount(10)) hace:
          1. incrementByAmount(10) crea: { type: 'counter/incrementByAmount', payload: 10 }
          2. Redux ejecuta el reducer incrementByAmount
          3. El reducer hace: state.value += action.payload (10)
          4. Estado cambia: { counter: { value: 10 } }
          5. Se re-renderiza */}
    </div>
  )
}
```

**Flujo visual Redux:**

```
Usuario click "Aumentar"
  ↓
dispatch(increment())
  ↓
Redux crea action: { type: 'counter/increment' }
  ↓
Redux busca el reducer para ese type
  ↓
Ejecuta: increment(state) { state.value += 1 }
  ↓
Estado nuevo: { counter: { value: 1 } }
  ↓
useSelector detecta: "el valor cambió de 0 a 1"
  ↓
Componente se re-renderiza
  ↓
count ahora es 1
  ↓
<p>Contador: 1</p>
```

---

## **Context API**

### Paso 1: Crear el contexto

Archivo: `context/UserContext.js`

```javascript
'use client'

import { createContext, useState } from 'react'

// createContext() crea un contexto vacío
export const UserContext = createContext()
// ↑ Este objeto conecta Provider (que envía datos) con Consumer (que recibe)

export function UserProvider({ children }) {
  // Este componente proporciona los datos a todos los descendientes

  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const login = (userData) => {
    setUser(userData)
    setIsAuthenticated(true)
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
  }

  // El value es lo que va a estar disponible en todos los descendientes
  const value = {
    user,
    isAuthenticated,
    login,
    logout,
  }

  return (
    <UserContext.Provider value={value}>
      {/* Todos los componentes dentro de Provider pueden usar el contexto */}
      {children}
    </UserContext.Provider>
  )
}
```

### Paso 2: Crear un hook personalizado

Archivo: `hooks/useUser.js`

```javascript
'use client'

import { useContext } from 'react'
import { UserContext } from '@/context/UserContext'

// Este hook simplifica el acceso al contexto
export function useUser() {
  const context = useContext(UserContext)
  // ↑ useContext(UserContext) retorna el value del Provider más cercano

  if (!context) {
    throw new Error('useUser debe usarse dentro de <UserProvider>')
  }

  return context
  // Retorna: { user, isAuthenticated, login, logout }
}
```

### Paso 3: Envolver la app

Archivo: `app/layout.js`

```javascript
import { UserProvider } from '@/context/UserContext'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {/* UserProvider pone el contexto disponible a todos los descendientes */}
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  )
}
```

### Paso 4: Usar en componentes

Archivo: `app/components/Header.js`

```javascript
'use client'

import { useUser } from '@/hooks/useUser'

export function Header() {
  // Accedemos al contexto con nuestro hook
  const { user, isAuthenticated, logout } = useUser()
  // ↑ useUser() busca el UserContext.Provider más cercano
  //   y retorna su value

  return (
    <header>
      {isAuthenticated ? (
        <div>
          <p>Hola, {user.name}!</p>
          <button onClick={logout}>Cerrar sesión</button>
          {/* ↑ logout modifica el estado en UserProvider
              UserProvider se re-renderiza con nuevo state
              Todos sus descendientes ven el cambio */}
        </div>
      ) : (
        <p>Inicia sesión</p>
      )}
    </header>
  )
}

export function LoginForm() {
  const { login } = useUser()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const userData = { id: 1, name: 'Juan' }
    login(userData)
    // ↑ Llama a login() que está en UserProvider
    //   setUser(userData) se ejecuta
    //   El estado de UserProvider cambia
    //   UserProvider se re-renderiza
    //   Header ve isAuthenticated = true y se re-renderiza
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit">Iniciar sesión</button>
    </form>
  )
}
```

**Diferencia clave: Re-renders**

```
SIN optimización:
  Si cambias user → UserProvider se re-renderiza
  → Todos los descendientes se re-renderizan (INEFICIENTE)

CON useMemo:
export function UserProvider({ children }) {
  const [user, setUser] = useState(null)

  const value = useMemo(() => ({
    user,
    login,
    logout
  }), [user])
  // ↑ Solo crea un nuevo object si user cambió
  //   Si user no cambió, reutiliza el objeto anterior
  //   Componentes que usan useContext no se re-renderizan innecesariamente
}
```

---

# **LIBRERÍAS DE DATA FETCHING**

## **React Query**

Archivo: `app/components/ProductsList.js`

```javascript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function ProductsList() {
  // ========== LEER DATOS ==========

  const { data, isLoading, error, isError } = useQuery({
    // queryKey es la CLAVE para cachear
    // Si la misma key se usa en otro lugar, comparte el caché
    queryKey: ['products'],
    // ↑ Si tienes filtros: ['products', { category: 'electronics' }]
    //   React Query crea caché separado para cada key

    queryFn: async () => {
      // La función que trae los datos
      const response = await fetch('/api/products')

      if (!response.ok) {
        throw new Error('Error trayendo productos')
      }

      return response.json()
      // Retorna: [{ id: 1, name: 'Laptop', price: 999 }, ...]
    },

    staleTime: 5 * 60 * 1000,
    // ↑ 5 minutos. Si alguien pide 'products' dentro de 5 min,
    //   React Query usa caché (no hace fetch)
    //   Después de 5 minutos, los datos están "stale" (viejos)
    //   En background, puede hacer refetch

    gcTime: 10 * 60 * 1000,
    // ↑ 10 minutos. Si nadie usa 'products' por 10 min, borra del caché

    refetchOnWindowFocus: true,
    // ↑ Si el usuario minimiza la ventana y vuelve, refetch automático

    retry: 3,
    // ↑ Si falla, reintenta 3 veces antes de mostrar error
  })

  // Datos mientras carga
  if (isLoading) {
    return <div>Cargando productos...</div>
  }

  // Datos si hubo error
  if (isError) {
    return <div>Error: {error.message}</div>
  }

  // Si llegamos aquí, data tiene los productos
  // data = [{ id: 1, name: 'Laptop', price: 999 }, ...]

  return (
    <div>
      <h2>Productos</h2>
      <ul>
        {data.map((product) => (
          <li key={product.id}>
            {product.name} - ${product.price}
            <DeleteButton productId={product.id} />
          </li>
        ))}
      </ul>
      <AddProductForm />
    </div>
  )
}

// ========== CREAR DATOS ==========

function AddProductForm() {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')

  // useQueryClient te permite controlar el caché manualmente
  const queryClient = useQueryClient()

  // useMutation se usa para POST, PUT, DELETE (modificar datos)
  const mutation = useMutation({
    mutationFn: async (newProduct) => {
      // Función que crea el producto
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      })

      return response.json()
      // Retorna: { id: 5, name: 'Producto nuevo', price: 100 }
    },

    onSuccess: (newProduct) => {
      // Después de que POST se ejecuta exitosamente
      // queryClient.invalidateQueries(['products']) =
      // "Marca los datos de 'products' como stale"
      // React Query hará refetch automático
      queryClient.invalidateQueries({ queryKey: ['products'] })
      // ↑ O si quieres ser más específico:
      // queryClient.setQueryData(['products'], (oldData) => [...oldData, newProduct])

      // Limpiar form
      setName('')
      setPrice('')
    },

    onError: (error) => {
      // Si el POST falla
      console.error('Error creando producto:', error)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // mutation.mutate ejecuta la función mutationFn
    mutation.mutate({
      name,
      price: parseFloat(price),
    })
    // ↑ Cuando esto termina:
    //   1. mutationFn se ejecuta
    //   2. Si éxito, onSuccess se ejecuta
    //   3. invalidateQueries marca datos como stale
    //   4. useQuery detecta "datos stale" y hace refetch
    //   5. Componente se re-renderiza con productos actualizados
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Precio"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        // ↑ isPending = true mientras se ejecuta el POST
      >
        {mutation.isPending ? 'Guardando...' : 'Agregar'}
      </button>
    </form>
  )
}

// ========== ELIMINAR DATOS ==========

function DeleteButton({ productId }) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })
    },

    onSuccess: () => {
      // Opción 1: Invalidar y dejar que refetch
      // queryClient.invalidateQueries({ queryKey: ['products'] })

      // Opción 2: Actualizar caché manualmente (más rápido)
      queryClient.setQueryData(
        ['products'],
        (oldData) => oldData.filter((p) => p.id !== productId)
        // ↑ Retorna array sin el producto eliminado
      )
    },
  })

  return (
    <button onClick={() => mutation.mutate()}>{mutation.isPending ? '...' : 'Eliminar'}</button>
  )
}
```

**Flujo React Query:**

```
useQuery({ queryKey: ['products'], queryFn: ... })
  ↓
¿'products' en caché?
  ├─ SÍ y NO está stale → retorna datos del caché (INSTANTÁNEO)
  ├─ SÍ pero está stale → retorna datos VIEJOS y en background hace fetch
  └─ NO → isLoading = true, hace fetch
  ↓
Fetch termina:
  ├─ Éxito → data = resultados, isLoading = false, re-renderiza
  └─ Error → error = mensaje, isError = true, re-renderiza

invalidateQueries(['products']):
  ↓
React Query marca 'products' como stale
  ↓
Si no hay componente usando esa query → borra del caché
  ↓
Si hay componente usando esa query → isLoading = true y hace refetch
```

---

## **SWR**

Archivo: `app/components/UserProfile.js`

```javascript
'use client'

import useSWR from 'swr'

// Función fetch (reutilizable)
const fetcher = (url) => fetch(url).then((r) => r.json())

export function UserProfile({ userId }) {
  // useSWR es la función principal
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users/${userId}`,
    // ↑ URL a fetch. También es la KEY para caché

    fetcher,
    // ↑ Función que trae los datos

    {
      revalidateOnFocus: true,
      // ↑ Si usuario vuelve a la ventana, refetch automático

      dedupingInterval: 60000,
      // ↑ Si dos componentes piden `/api/users/1` en 60s,
      //   SWR solo hace UN fetch (deduplica)

      focusThrottleInterval: 300000,
      // ↑ No refetch si volvió a la ventana hace menos de 5 min

      errorRetryCount: 3,
      // ↑ Reintenta 3 veces en caso de error
    }
  )

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error.message}</div>

  // data = { id: 1, name: 'Juan', email: 'juan@mail.com' }

  return (
    <div>
      <h2>{data.name}</h2>
      <p>{data.email}</p>
      <UpdateButton userId={userId} />
    </div>
  )
}

function UpdateButton({ userId }) {
  const { mutate } = useSWR(`/api/users/${userId}`, fetcher)

  const handleUpdate = async () => {
    // mutate() puede hacer dos cosas:

    // Opción 1: Invalidar y refetch
    mutate()
    // ↑ SWR hace fetch de nuevo a `/api/users/{userId}`

    // Opción 2: Actualizar caché localmente mientras fetches
    mutate(
      fetch(`/api/users/${userId}`, { method: 'PUT' }).then((r) => r.json()),
      // ↑ Este es el fetch/Promise

      false // No revalidar (solo actualizar caché local)
    )
    // Cuando el fetch termina, automáticamente actualiza la UI
  }

  return <button onClick={handleUpdate}>Actualizar</button>
}
```

**Diferencia SWR vs React Query:**

```
React Query:
  - Más features (paginación, infinite scroll, etc.)
  - Más pesado en bundle
  - Más flexible

SWR:
  - Más simple
  - Más ligero
  - Suficiente para la mayoría de casos
```

---

## **Fetch nativo (sin librería)**

Archivo: `app/components/SimpleList.js`

```javascript
'use client'

import { useState, useEffect } from 'react'

export function SimpleList() {
  // Necesitas manualmente guardar TODO esto
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Función asíncrona para fetch
    const fetchData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        // ↑ Resetea estado antes de fetch

        const response = await fetch('/api/items')

        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }

        const json = await response.json()
        setData(json)
        // ↑ Guarda datos
      } catch (err) {
        setError(err.message)
        // ↑ Guarda error
      } finally {
        setIsLoading(false)
        // ↑ Siempre se ejecuta (éxito o error)
      }
    }

    fetchData()
  }, []) // Solo corre una vez cuando monta

  // Problema: Sin caché automático
  // Si renderizas <SimpleList /> dos veces, hace TWO fetches
  // Con React Query, haría ONE (comparte caché)

  if (isLoading) return <div>Cargando...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <ul>
      {data.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
```

**Por qué NO usar fetch puro:**

```
1. Código repetido en cada componente
2. Sin caché (cada fetch = request a servidor)
3. Sin invalidación automática
4. Sin deduplicación
5. Sin retry automático
6. Manejo de errores manual

Con React Query/SWR:
  - Todo automático
  - Caché inteligente
  - Invalidación sencilla
  - Menos código
```

---

## **COMPARACIÓN COMPLETA**

```javascript
// Mismo caso de uso: Traer lista de productos

// 1. FETCH PURO (❌ NO RECOMENDADO)
const [products, setProducts] = useState(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)

useEffect(() => {
  fetch('/api/products')
    .then((r) => r.json())
    .then((d) => setProducts(d))
    .catch((e) => setError(e))
    .finally(() => setLoading(false))
}, [])

// ❌ Mucho código boilerplate
// ❌ Sin caché
// ❌ Sin retry

// 2. SWR (✅ BIEN)
const { data: products, error, isLoading } = useSWR('/api/products', fetcher)

// ✅ Una línea
// ✅ Caché automático
// ✅ Deduplicación
// ✅ Retry automático

// 3. REACT QUERY (✅ MÁS ROBUSTO)
const {
  data: products,
  error,
  isLoading,
} = useQuery({
  queryKey: ['products'],
  queryFn: () => fetch('/api/products').then((r) => r.json()),
  staleTime: 5 * 60 * 1000,
})

// ✅ Una línea (con configuración)
// ✅ Caché inteligente
// ✅ Invalidación manual
// ✅ Más features
```

---

**Las categorías principales son:**

| Categoría                   | Principales             | Alternativas          |
| --------------------------- | ----------------------- | --------------------- |
| **Rendering**               | SSR, ISR, SSG, CSR      | PPR, Streaming        |
| **State**                   | Zustand, Redux, Context | Recoil, Jotai, Valtio |
| **Data Fetching (REST)**    | React Query, SWR        | RTK Query, Axios      |
| **Data Fetching (GraphQL)** | Apollo Client           | Urql                  |

**En la práctica, 99% de los proyectos usan:**

```
Rendering: CSR + ISR (o PPR si es Next.js 15+)
State: Zustand (simple) o Redux (complejo)
Data: React Query o SWR
```
