# 🔴 Vulnerabilidades de Seguridad Encontradas

**Fecha inicial:** 4 de Enero, 2026
**Revisión:** 20 de Mayo, 2026
**Fuente:** Tests críticos de seguridad (authenticateToken, demoRestriction)
**Estado:** 3 abiertos (1+2+4 relacionados) · 1 cerrado (#5) · 2 diseño intencional (#3, #7) · 1 pendiente decisión (#8)

---

## 📊 Resumen Ejecutivo

Durante la implementación de tests críticos de seguridad, se identificaron **8 vulnerabilidades** en el sistema de autenticación y restricciones demo:

- **3 Críticas** (requieren atención inmediata)
- **3 Altas** (debilidades de diseño significativas)
- **2 Medias** (mejoras recomendadas)

**Estado tras revisión 2026-05-20:**

| # | Hallazgo | Severidad | Estado |
|---|---|---|---|
| 1 | No verifica existencia en BD | 🔴 Crítica | ⚠️ Abierto |
| 2 | No verifica `is_active` | 🔴 Crítica | ⚠️ Abierto |
| 3 | Sin revocación de tokens | 🔴 Crítica | ✅ Decisión consciente (JWT stateless) |
| 4 | Role injection vía token | 🟡 Alta | ⚠️ Abierto (se resuelve con #1/#2) |
| 5 | Case-sensitive role comparison | 🟡 Alta | ✅ Cerrado (`.toLowerCase()` implementado) |
| 6 | Email vacío en req.user | 🟡 Alta | ⚠️ Abierto (se resuelve con #1/#2) |
| 7 | Demo ve datos sensibles GET | 🟢 Media | ✅ Intencional + demo desactivado en prod |
| 8 | Sin ownership en comentarios logbook | 🟢 Media | 🤔 Pendiente decisión de diseño |

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. No hay verificación de existencia del usuario en BD

**Archivo:** `middlewares/authenticateToken.ts` (línea 39-45)
**Severidad:** 🔴 CRÍTICA
**Estado (2026-05-20):** ⚠️ ABIERTO — sin cambios desde enero. Mitigación parcial: el access token dura solo 15 minutos, por lo que la ventana de exposición es acotada. El endpoint `GET /me` sí consulta BD, pero no se llama en cada request protegida.
**Impacto:** Un usuario eliminado de la BD puede seguir usando su token JWT hasta que expire

**Descripción:**
El middleware `authenticateToken` solo verifica la validez del JWT, pero **NO consulta la base de datos** para confirmar que el usuario aún existe.

**Escenario de ataque:**
1. Usuario tiene un access_token válido (exp: 15 min)
2. Admin elimina al usuario de la BD
3. Usuario puede seguir accediendo al sistema durante 15 minutos más

**Código actual:**
```typescript
// authenticateToken.ts - línea 39
const decoded = verifyToken(token) // Solo verifica JWT

req.user = {
  id: decoded.id,        // NO verifica que exista en BD
  username: decoded.username,
  email: '',
  role: decoded.role,
}
```

**Solución propuesta:**
```typescript
const decoded = verifyToken(token)

// ✅ Verificar que el usuario existe en BD
const user = await UserRepository.findById(decoded.id)
if (!user) {
  res.status(401).json({ error: 'Usuario no encontrado' })
  return
}

req.user = {
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
}
```

**Tareas:**
- [ ] Agregar verificación de existencia en BD
- [ ] Agregar test: "debe rechazar token de usuario eliminado"
- [ ] Considerar caché de usuarios para no consultar BD en cada request

---

### 2. No hay verificación de estado `is_active` del usuario

**Archivo:** `middlewares/authenticateToken.ts` (línea 39-45)
**Severidad:** 🔴 CRÍTICA
**Estado (2026-05-20):** ⚠️ ABIERTO — sin cambios desde enero. El campo `is_active` existe en la tabla `users` y se usó para deshabilitar el usuario demo (2026-05-12), pero el middleware no lo lee. Mismo problema que #1: ventana máxima de 15 min por la duración del access token.
**Impacto:** Usuarios desactivados pueden seguir accediendo al sistema

**Descripción:**
Aunque la tabla `users` tiene un campo `is_active`, el middleware **no lo verifica**.

**Escenario de ataque:**
1. Admin desactiva temporalmente a un usuario (is_active = 0)
2. Usuario puede seguir usando su token JWT hasta que expire
3. No hay forma de bloquear acceso inmediatamente

**Solución propuesta:**
```typescript
const user = await UserRepository.findById(decoded.id)
if (!user || !user.is_active) {
  res.status(401).json({ error: 'Usuario inactivo o no encontrado' })
  return
}
```

**Tareas:**
- [ ] Verificar campo `is_active` en middleware
- [ ] Agregar test: "debe rechazar token de usuario inactivo"
- [ ] Documentar en API que cambiar is_active no invalida tokens activos

---

### 3. No hay mecanismo de revocación de tokens

**Archivo:** `middlewares/authenticateToken.ts`
**Severidad:** 🔴 CRÍTICA
**Estado (2026-05-20):** ✅ DECISIÓN ARQUITECTÓNICA CONSCIENTE — JWT stateless sin blocklist es el diseño elegido. El logout borra las cookies HttpOnly en el cliente, lo que es suficiente para el modelo de amenaza actual (no hay tokens en localStorage, el vector de extracción requiere acceso físico o interceptación de red). Si se necesitara revocación inmediata se implementaría token versioning en BD (ver opción B abajo). No está planificado hasta Horizonte 2.
**Impacto:** Tokens comprometidos no pueden ser invalidados individualmente

**Descripción:**
El sistema JWT actual **no tiene lista negra (blacklist)** de tokens. Si un token es comprometido, la única opción es cambiar `SECRET_JWT_KEY`, lo que invalida **todos** los tokens de **todos** los usuarios.

**Escenario de ataque:**
1. Token de admin es robado/comprometido
2. Admin detecta el robo
3. **No hay forma de invalidar solo ese token**
4. Única opción: cambiar SECRET_JWT_KEY (desloguea a TODOS los usuarios)

**Soluciones posibles:**

**Opción A: Token Blacklist (Redis)**
```typescript
// Guardar tokens revocados en Redis
await redis.setex(`blacklist:${tokenId}`, ttl, '1')

// Verificar en middleware
const isBlacklisted = await redis.exists(`blacklist:${tokenId}`)
if (isBlacklisted) {
  return res.status(401).json({ error: 'Token revocado' })
}
```

**Opción B: Token versioning en BD**
```sql
ALTER TABLE users ADD COLUMN token_version INT DEFAULT 0;
```
```typescript
// JWT incluye token_version
const token = jwt.sign({ id, username, role, token_version }, SECRET)

// Verificar en middleware
if (decoded.token_version !== user.token_version) {
  return res.status(401).json({ error: 'Token obsoleto' })
}

// Revocar tokens: incrementar token_version
await UserRepository.incrementTokenVersion(userId)
```

**Opción C: Refresh Token Rotation**
- Access tokens de corta duración (5 min)
- Refresh tokens almacenados en BD (pueden ser revocados)

**Tareas:**
- [ ] Decidir estrategia de revocación (A, B o C)
- [ ] Implementar mecanismo seleccionado
- [ ] Agregar endpoint `/api/auth/revoke-token`
- [ ] Agregar tests para revocación

---

## 🟡 VULNERABILIDADES ALTAS

### 4. Role injection vía token JWT

**Archivo:** `middlewares/authenticateToken.ts` (línea 52)
**Severidad:** 🟡 ALTA
**Estado (2026-05-20):** ⚠️ ABIERTO — el rol sigue leyéndose del token, no de la BD. Relacionado con #1 y #2: la solución de consultar BD en cada request resolvería los tres a la vez. Ver `TODO.md → H2-11` para el plan de auditoría.
**Impacto:** Si SECRET_JWT_KEY es comprometido, atacante puede crear tokens admin

**Descripción:**
El rol del usuario viene directamente del payload del token JWT. El sistema **confía ciegamente** en el rol sin verificarlo en la BD.

**Escenario de ataque:**
1. Atacante obtiene SECRET_JWT_KEY (leak, brute force, etc.)
2. Genera token propio: `{ id: 'cualquiera', role: 'admin' }`
3. Accede como admin sin ser admin real

**Código actual:**
```typescript
req.user = {
  id: decoded.id,
  username: decoded.username,
  email: '',
  role: decoded.role,  // ⚠️ Confía en el token, no en la BD
}
```

**Solución propuesta:**
```typescript
const user = await UserRepository.findById(decoded.id)
if (!user) {
  return res.status(401).json({ error: 'Usuario no encontrado' })
}

req.user = {
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,  // ✅ Viene de la BD, no del token
}
```

**Tareas:**
- [ ] Obtener rol desde BD, no desde token
- [ ] Rotar SECRET_JWT_KEY periódicamente
- [ ] Agregar test: "debe usar rol de BD, no de token"

---

### 5. Case-sensitive role comparison en demoRestriction

**Archivo:** `middlewares/demoRestriction.ts`
**Severidad:** 🟡 ALTA
**Estado (2026-05-20):** ✅ CERRADO — verificado en código. `demoRestriction.ts` usa `.toLowerCase()` en la comparación. Además `roleCheck.ts` tiene `isRealAdmin` que excluye explícitamente a `demo-admin` con un 403. La defensa en profundidad está implementada.
**Impacto:** ~~Usuario con rol 'DEMO-ADMIN' o 'Demo-Admin' evita restricciones~~ (resuelto)

**Descripción:**
El middleware compara `role === 'demo-admin'` de forma **case-sensitive**. Un usuario con rol 'DEMO-ADMIN' (mayúsculas) no será detectado como demo.

**Test que falla:**
```typescript
it('⚠️ BUG: Case-sensitive role comparison', () => {
  mockRequest.user = { role: 'DEMO-ADMIN' } // Mayúsculas
  mockRequest.method = 'POST'

  demoRestriction(req, res, next)

  expect(mockNext).toHaveBeenCalled() // ⚠️ Pasa cuando debería bloquear
})
```

**Solución:**
```typescript
// demoRestriction.ts
if (req.user.role.toLowerCase() === 'demo-admin') {
  // Aplicar restricciones
}
```

**Tareas:**
- [ ] Normalizar comparación de roles (.toLowerCase())
- [ ] Aplicar en todos los middlewares de roleCheck
- [ ] Agregar test: "debe ser case-insensitive"

---

### 6. Email siempre vacío en req.user

**Archivo:** `middlewares/authenticateToken.ts` (línea 51)
**Severidad:** 🟡 ALTA
**Estado (2026-05-20):** ⚠️ ABIERTO — el email sigue sin estar en el payload JWT. Sin embargo no hay evidencia de que algún endpoint dependa de `req.user.email`. Se resolvería automáticamente si se implementa la consulta a BD en cada request (#1/#2/#4).
**Impacto:** Código que dependa de `req.user.email` no funciona

**Descripción:**
El email no está incluido en el payload del JWT, por lo que `req.user.email` siempre es una cadena vacía.

**Código actual:**
```typescript
req.user = {
  id: decoded.id,
  username: decoded.username,
  email: '', // ⚠️ Siempre vacío
  role: decoded.role,
}
```

**Soluciones posibles:**

**Opción A: Incluir email en JWT**
```typescript
// tokenService.ts
const payload = {
  id: user.id,
  username: user.username,
  email: user.email,  // ✅ Agregar email
  role: user.role,
}
```

**Opción B: Obtener email de BD**
```typescript
const user = await UserRepository.findById(decoded.id)
req.user = {
  id: user.id,
  username: user.username,
  email: user.email,  // ✅ Desde BD
  role: user.role,
}
```

**Tareas:**
- [ ] Decidir si incluir email en JWT o consultarlo en BD
- [ ] Actualizar tests
- [ ] Verificar que código existente no dependa de `email === ''`

---

## 🟢 VULNERABILIDADES MEDIAS

### 7. Demo puede ver datos sensibles con GET

**Archivo:** `middlewares/demoRestriction.ts`
**Severidad:** 🟢 MEDIA
**Estado (2026-05-20):** ✅ DISEÑO INTENCIONAL — el usuario demo existe para demostrar el sistema. Ver datos (solo lectura) es el comportamiento esperado. El usuario demo está desactivado en producción desde 2026-05-12.
**Impacto:** ~~Usuario demo puede ver facturas, reportes, información de backoffice~~ (intencional)

**Descripción:**
El middleware `demoRestriction` permite **todos** los requests GET, incluso a endpoints sensibles como `/api/backoffice/invoices`.

**Escenario:**
```javascript
// Demo puede hacer:
GET /api/backoffice/invoices       ✅ Permitido
GET /api/cashier/shifts/1          ✅ Permitido
GET /api/users                     ✅ Permitido
```

**¿Es un bug?**
Depende del diseño:
- ✅ **Intencional:** Si el demo debe poder VER todo (solo lectura)
- ⚠️ **Bug:** Si hay endpoints sensibles que no debe ver

**Solución (si es bug):**
```typescript
// Blacklist de rutas GET sensibles para demo
const DEMO_GET_BLACKLIST = [
  '/api/backoffice',
  '/api/cashier/reports',
  '/api/users',
]

if (req.method === 'GET') {
  const isSensitive = DEMO_GET_BLACKLIST.some(path =>
    req.originalUrl.startsWith(path)
  )
  if (isSensitive) {
    return res.status(403).json({ error: 'No puedes ver esta información en modo demo' })
  }
}
```

**Tareas:**
- [ ] Decidir si es intencional o bug
- [ ] Si es bug: crear blacklist de GET
- [ ] Documentar qué puede ver el demo

---

### 8. Sin verificación de ownership en comentarios de logbook

**Archivo:** `middlewares/demoRestriction.ts`
**Severidad:** 🟢 MEDIA
**Estado (2026-05-20):** 🤔 PENDIENTE DECISIÓN — el logbook es un módulo colaborativo (notas del turno para todo el equipo), por lo que comentar en entradas ajenas puede ser intencional. Sin datos de uso real no se puede determinar si es un bug o diseño correcto.
**Impacto:** Demo puede comentar en cualquier logbook (no solo los suyos)

**Descripción:**
La whitelist permite `POST /api/logbooks/:id/comments` para demo, pero **no verifica ownership**. El demo puede comentar en logbooks de otros usuarios.

**Código actual:**
```typescript
// demoRestriction.ts - Whitelist
const allowedPaths = [
  { method: 'POST', pattern: /^\/api\/logbooks\/\d+\/comments$/ },  // ⚠️ Sin ownership check
]
```

**¿Es un bug?**
Depende del diseño:
- ✅ **Intencional:** Si todos pueden comentar en cualquier logbook
- ⚠️ **Bug:** Si solo puedes comentar tus propios logbooks

**Solución (si es bug):**
Agregar middleware de ownership antes de demoRestriction:
```typescript
// middlewares/checkLogbookOwnership.ts
export async function checkLogbookOwnership(req, res, next) {
  const logbookId = req.params.id
  const logbook = await LogbookRepository.findById(logbookId)

  if (logbook.author_id !== req.user.id) {
    return res.status(403).json({ error: 'No puedes comentar este logbook' })
  }

  next()
}
```

**Tareas:**
- [ ] Decidir si es intencional o bug
- [ ] Si es bug: agregar middleware de ownership
- [ ] Actualizar tests

---

## 📋 Plan de Acción Recomendado

### Prioridad 1 - CRÍTICAS (resolver en 1-2 semanas)
1. ✅ Verificar existencia de usuario en BD (#1)
2. ✅ Verificar estado `is_active` (#2)
3. ✅ Implementar mecanismo de revocación de tokens (#3)

### Prioridad 2 - ALTAS (resolver en 2-4 semanas)
4. ✅ Obtener rol desde BD, no desde token (#4)
5. ✅ Normalizar comparación de roles (case-insensitive) (#5)
6. ✅ Incluir email en req.user (#6)

### Prioridad 3 - MEDIAS (evaluar y decidir)
7. 🤔 Decidir si demo debe ver datos sensibles (#7)
8. 🤔 Decidir si demo debe poder comentar en cualquier logbook (#8)

---

## 🔒 Mejores Prácticas Recomendadas

### 1. Consultar BD en cada request autenticado
- ✅ Verificar existencia
- ✅ Verificar is_active
- ✅ Obtener rol actualizado
- ⚠️ Considerar caché para performance

### 2. Implementar token blacklist
- Redis para tokens revocados
- O token versioning en BD

### 3. Normalizar todas las comparaciones de strings
```typescript
role.toLowerCase() === 'admin'
username.toLowerCase() === expected.toLowerCase()
```

### 4. Reducir tiempo de expiración de access_token
- Actual: 15 minutos
- Recomendado: 5 minutos
- Usar refresh tokens de larga duración

### 5. Agregar rate limiting por usuario
- Actual: Solo rate limiting por IP en login
- Recomendado: Rate limiting por user_id en todas las rutas

---

## 📊 Métricas de Seguridad

### Estado Actual (revisión 2026-05-20)
- **Tests de seguridad:** 20 tests críticos implementados
- **Vulnerabilidades detectadas:** 8 (3 críticas, 3 altas, 2 medias)
- **Cerradas / decisión consciente:** 2 (#3, #5)
- **Diseño intencional:** 1 (#7)
- **Abiertos:** 4 (#1, #2, #4, #6 — se resuelven todos a la vez consultando BD en `authenticateToken`)
- **Pendiente decisión:** 1 (#8)

### Próxima acción recomendada

Implementar consulta a BD en `authenticateToken` (un único cambio cierra #1, #2, #4 y #6 simultáneamente). Ver `TODO.md → Horizonte 2` para el plan.

---

**Última actualización:** 2026-05-20
