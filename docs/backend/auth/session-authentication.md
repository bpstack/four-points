# Notas rápidas: autenticación y API (frontend)

**Origen:** `backend/docs/AUTH.md`

---

## Estrategia de Autenticación

- **Cookies HttpOnly** para access/refresh, sin `localStorage` (dev y prod)
- `apiClient` es el único fetcher; siempre usa `credentials: 'include'` y refresco por cookies
- En 401 o refresh fallido redirige a `/login` y limpia cookies

## Route Handlers de Auth

Los handlers (`login/refresh/me/logout/register`) validan método y respuestas, manejan cookies HttpOnly y devuelven errores claros.

## Variables de Entorno

- `API_BASE_URL` (cliente) y `SERVER_API_BASE_URL` (server actions/route handlers) se definen en `frontend/app/lib/env.ts`
- No usar `process.env` directo en módulos

## Subida/Descarga

FormData/Blob también depende de cookies; no agrega headers de autorización ni toca `localStorage`.

## Server Actions

`maintenance/blacklist/parking` leen token de `cookies()` y usan `SERVER_API_BASE_URL`. Seguir el mismo patrón si se crean más actions.

## React Query

Debe usar `apiClient` y mantener claves consistentes; invalidar tras mutaciones (ver `conciliation/cashier`).

---

## `auth/session-auth Ver también

-entication.md` - Migración JWT→Sessions completa
- `security/security-plan.md` - Plan de seguridad completo


---

## 🎯 OBJETIVO

Migrar de **JWT + Refresh Tokens + localStorage** a **Express-Session + MySQL** para simplificar autenticación en hotel (10-20 usuarios internos).

**Beneficios:**
- ✅ 71% menos código
- ✅ Logout real e instantáneo
- ✅ Control total de sesiones
- ✅ Más seguro (sin localStorage)
- ✅ Sin auto-refresh complejo

---

## 📦 DEPENDENCIAS NUEVAS

```bash
npm install express-session express-mysql-session
```

---

## 🗂️ ARCHIVOS DEL BACKEND

### **Crear:**
- `config/sessionConfig.js` - Configuración de express-session + MySQL store
- `middleware/authenticateSession.js` - Reemplaza authenticateToken
- `controllers/session-controller.js` - (Opcional) Gestión de sesiones activas
- `routes/session-routes.js` - (Opcional) Endpoints admin

### **Modificar:**
- `controllers/auth-controllers.js` - Cambiar JWT por `req.session.user = {...}`
- `index.js` - Añadir `app.use(session(sessionConfig))`
- Todas las rutas: `authenticateToken` → `authenticateSession`

### **Eliminar:**
- `middleware/authenticateToken.js`
- `services/tokenService.js`

---

## ⚙️ CONFIGURACIÓN MÍNIMA

### **Backend:**

```javascript
// config/sessionConfig.js
import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'

const MySQLStore = MySQLStoreFactory(session)

export const sessionConfig = {
  key: 'hotel_session',
  secret: process.env.SESSION_SECRET,
  store: new MySQLStore({
    createDatabaseTable: true,
    // ... config de MySQL pool
  }),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000, // 8h
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  rolling: true, // Extiende sesión con actividad
}

// index.js
app.use(session(sessionConfig)) // ← ANTES de las rutas
```

### **Frontend:**

```typescript
// Simply add credentials: 'include' in ALL fetch
fetch(url, {
  credentials: 'include', // ← Sends cookies automatically
})
```

---

## 🔄 CAMBIOS POR ARCHIVO

### **1. auth-controllers.js**

```javascript
// ANTES
const token = generateAccessToken(user)
res.cookie('access_token', token, { httpOnly: true })

// DESPUÉS
req.session.user = { id, username, role }
res.json({ success: true, user })
```

### **2. authenticateSession.js (NUEVO)**

```javascript
export function authenticateSession(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  req.user = req.session.user // ← Para compatibilidad con roleCheck
  next()
}
```

### **3. authLogin.ts (Frontend)**

```typescript
// ANTES: localStorage + tokens
localStorage.setItem('access_token', data.token)

// DESPUÉS: Solo fetch, cookies automáticas
await fetch(url, { credentials: 'include' })
// ✅ No hay localStorage
// ✅ No hay tokens
```

---

## 📊 TABLA SESSIONS (Auto-creada)

```sql
CREATE TABLE sessions (
  session_id VARCHAR(128) PRIMARY KEY,
  expires INT UNSIGNED,
  data MEDIUMTEXT -- JSON con user info
);
```

**Contenido ejemplo:**

```json
{
  "user": { "id": "c488...", "username": "Sara", "role": "admin" },
  "loginAt": "2025-10-23T10:00:00Z",
  "device": "Mozilla/5.0...",
  "ipAddress": "192.168.1.100"
}
```

---

## 🧪 TESTING BÁSICO

```bash
# 1. Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"sara","password":"***"}' \
  -c cookies.txt

# 2. Ruta protegida
curl http://localhost:4000/api/auth/me -b cookies.txt
# ✅ Debe funcionar

# 3. Sin cookie
curl http://localhost:4000/api/auth/me
# ❌ Debe dar 401

# 4. Verificar DB
SELECT * FROM sessions;
# ✅ Debe haber 1 fila
```

---

## 🔑 PUNTOS CRÍTICOS

### **CORS (Backend):**

```javascript
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true, // ← CRÍTICO
  }),
)
```

### **Credentials (Frontend):**

```typescript
// EN TODOS LOS FETCH
credentials: 'include'
```

### **Orden middlewares (Backend):**

```javascript
app.use(express.json())
app.use(cookieParser())
app.use(cors({ credentials: true }))
app.use(session(sessionConfig)) // ← ANTES de rutas
app.use('/api/auth', authRoutes) // ← DESPUÉS de session
```

---

## ❓ PREGUNTAS FRECUENTES

| Pregunta | Respuesta |
|----------|-----------|
| ¿Misma IP, múltiples PCs? | ✅ Sí, cada navegador tiene su cookie única |
| ¿Usuario en varios dispositivos? | ✅ Sí, múltiples sesiones simultáneas |
| ¿Migrar usuarios existentes? | ✅ No necesario, tabla `users` no cambia |
| ¿roleCheck.js cambia? | ❌ No, funciona igual (usa `req.user`) |
| ¿Ver todas las sesiones activas? | ✅ Sí, con endpoints de gestión (opcional) |
| ¿Cerrar sesión remota? | ✅ Sí, `DELETE FROM sessions WHERE session_id = ?` |

---

## 🚨 PLAN DE ROLLBACK

```bash
# Opción 1: Git
git reset --hard [commit_antes_migración]

# Opción 2: Restaurar backups
mv controllers/auth-controllers-JWT-BACKUP.js controllers/auth-controllers.js
mv middleware/authenticateToken-JWT-BACKUP.js middleware/authenticateToken.js
mv services/tokenService-JWT-BACKUP.js services/tokenService.js
```

---

## ✅ CHECKLIST MIGRACIÓN

### **Preparación:**
- [ ] Backup de código (`git commit`)
- [ ] Backup de BD (`mysqldump`)
- [ ] Añadir `SESSION_SECRET` al `.env`

### **Backend:**
- [ ] Instalar dependencias
- [ ] Crear `sessionConfig.js`
- [ ] Crear `authenticateSession.js`
- [ ] Modificar `auth-controllers.js` (login/logout/me)
- [ ] Integrar session middleware en `index.js`
- [ ] Cambiar todas las rutas a `authenticateSession`
- [ ] Renombrar archivos JWT a `-BACKUP`

### **Frontend:**
- [ ] Simplificar `authLogin.ts`
- [ ] Añadir `credentials: 'include'` en todos los fetch
- [ ] Eliminar referencias a localStorage
- [ ] Simplificar `useAuth.tsx`
- [ ] Actualizar `middleware.ts` (verificar `hotel_session`)
- [ ] Eliminar `api.ts` (auto-refresh)

### **Testing:**
- [ ] Login crea sesión en DB
- [ ] Cookie aparece en DevTools
- [ ] Rutas protegidas funcionan
- [ ] Logout destruye sesión
- [ ] Roles (admin/recep) funcionan
- [ ] localStorage vacío

---

## 📐 COMPARATIVA FINAL

| Métrica | JWT | Sessions | Cambio |
|---------|-----|----------|--------|
| Líneas código | ~830 | ~240 | **-71%** |
| Archivos backend | 8 | 5 | **-37%** |
| Archivos frontend | 6 | 3 | **-50%** |
| Logout efectivo | ⚠️ Difícil | ✅ Inmediato | ✅ |
| Control sesiones | ⚠️ Limitado | ✅ Total | ✅ |
| localStorage | ⚠️ Necesario | ❌ No usa | ✅ |

---

**Documento original:** `backend/README.md`
