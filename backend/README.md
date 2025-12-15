---
COMANDO PARA BUSCAR EN EL CODIGO
Get-ChildItem -Recurse -Include *.js,*.ts -Exclude node_modules,dist | Select-String "aqui pon lo que quieras, se excluye node_modules y dist"


# 🏨 For Points – Hotel Logbook & User Management System

**Proyecto:** Sistema de gestión de logbooks y usuarios para hoteles.
**Tecnologías:** Node.js, Express, MySQL, JWT, bcrypt, REST API.
**Autor:** Sara Pérez

---

## ⚙️ Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/tuusuario/for-points.git
cd for-points
```

2. **Configurar variables de entorno**
   Crea un archivo `.env` en la raíz con:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=hotel_db
JWT_SECRET=tu_clave_secreta
PORT=3000
```

# 📘 RESUMEN: MIGRACIÓN JWT → SESSIONS

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

```bashpn
npm install express-session express-mysql-session
```

---

## 🗂️ ESTRUCTURA DE ARCHIVOS

### **Backend - Crear:**

- `config/sessionConfig.js` - Configuración de express-session + MySQL store
- `middleware/authenticateSession.js` - Reemplaza authenticateToken
- `controllers/session-controller.js` - (Opcional) Gestión de sesiones activas
- `routes/session-routes.js` - (Opcional) Endpoints admin

### **Backend - Modificar:**

- `controllers/auth-controllers.js` - Cambiar JWT por `req.session.user = {...}`
- `index.js` - Añadir `app.use(session(sessionConfig))`
- Todas las rutas: `authenticateToken` → `authenticateSession`

### **Backend - Eliminar:**

- `middleware/authenticateToken.js`
- `services/tokenService.js`

### **Frontend - Modificar:**

- `app/lib/login/authLogin.ts` - Simplificar (solo fetch con `credentials: 'include'`)
- `app/lib/login/useAuth.tsx` - Eliminar localStorage
- `middleware.ts` - Verificar cookie `hotel_session` en lugar de `access_token`

### **Frontend - Eliminar:**

- `app/lib/auth/api.ts` - Ya no hay auto-refresh
- `app/lib/auth/cookieHandler.ts` - Express-session lo maneja
- `app/api/auth/*` - Proxies Next.js innecesarios

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
// Simplemente añadir credentials: 'include' en TODOS los fetch
fetch(url, {
  credentials: 'include', // ← Envía cookies automáticamente
})
```

---

## 🔄 CAMBIOS CLAVE POR ARCHIVO

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

### **4. Todas las rutas protegidas**

```javascript
// ANTES
router.get('/me', authenticateToken, controller.me)

// DESPUÉS
router.get('/me', authenticateSession, controller.me)
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

## ❓ DUDAS RESUELTAS

| Pregunta                         | Respuesta                                          |
| -------------------------------- | -------------------------------------------------- |
| ¿Misma IP, múltiples PCs?        | ✅ Sí, cada navegador tiene su cookie única        |
| ¿Usuario en varios dispositivos? | ✅ Sí, múltiples sesiones simultáneas              |
| ¿Migrar usuarios existentes?     | ✅ No necesario, tabla `users` no cambia           |
| ¿roleCheck.js cambia?            | ❌ No, funciona igual (usa `req.user`)             |
| ¿Ver todas las sesiones activas? | ✅ Sí, con endpoints de gestión (opcional)         |
| ¿Cerrar sesión remota?           | ✅ Sí, `DELETE FROM sessions WHERE session_id = ?` |

---

## 🚨 ROLLBACK PLAN

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

| Métrica           | JWT          | Sessions     | Cambio   |
| ----------------- | ------------ | ------------ | -------- |
| Líneas código     | ~830         | ~240         | **-71%** |
| Archivos backend  | 8            | 5            | **-37%** |
| Archivos frontend | 6            | 3            | **-50%** |
| Logout efectivo   | ⚠️ Difícil   | ✅ Inmediato | ✅       |
| Control sesiones  | ⚠️ Limitado  | ✅ Total     | ✅       |
| localStorage      | ⚠️ Necesario | ❌ No usa    | ✅       |

---

## 🎯 PRÓXIMOS PASOS

1. **Mantener sistema actual** (localStorage) para desarrollo
2. **Guardar esta documentación** para cuando estés listo
3. Cuando implementes:
   - Seguir la documentación completa paso a paso
   - Hacer backups antes de empezar
   - Testear cada fase antes de continuar
4. **(Opcional futuro)** Dashboard de sesiones activas para admin

---

**Documento guardado:** `MIGRATION_JWT_TO_SESSIONS.md`

**Listo para implementar cuando quieras** 🚀

Migración de JS a TS - Implementando Conciliación de pisos endpoints (archivo de implementación: C:\Users\dz\MEGAsync\Programming\02_Projects\Active\for-points-hotels\migracionTS+conciliación.txt)
(C:\Users\dz\MEGAsync\Programming\02_Projects\Active\for-points-hotels\migracionTS)

✅ Ejecutar SQL en LOCAL (5 min)
✅ Instalar dependencias (2 min)
✅ Crear tsconfig.json (1 min)
✅ Crear archivos base (types, models, config) (10 min)
