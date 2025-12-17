# Security Implementation

Este documento describe las medidas de seguridad implementadas en el sistema de autenticación de Four Points.

## Tabla de Contenidos

- [Rate Limiting](#rate-limiting)
- [Validación de Contraseñas](#validación-de-contraseñas)
- [Logging de Seguridad](#logging-de-seguridad)
- [Protección contra Timing Attacks](#protección-contra-timing-attacks)
- [Sanitización XSS](#sanitización-xss)
- [Archivos Modificados](#archivos-modificados)

---

## Rate Limiting

Implementado usando `express-rate-limit` para prevenir ataques de fuerza bruta.

### Configuración por Endpoint

| Endpoint | Límite | Ventana | Clave |
|----------|--------|---------|-------|
| `POST /api/auth/login` | 5 intentos | 15 minutos | IP + username |
| `PATCH /api/auth/me/password` | 3 intentos | 1 hora | User ID |
| `PATCH /api/auth/me/profile` | 5 intentos | 15 minutos | User ID |

### Respuestas de Rate Limit

Cuando se excede el límite, el servidor responde con:

```json
{
  "error": "Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos."
}
```

**HTTP Status:** `429 Too Many Requests`

### Archivo de Configuración

```typescript
// backend/middlewares/rateLimiter.ts

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  keyGenerator: (req) => `${req.ip}-${req.body?.username || ''}`
})

export const passwordChangeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  keyGenerator: (req) => `password-${req.user?.id || req.ip}`
})

export const profileUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5,
  keyGenerator: (req) => `profile-${req.user?.id || req.ip}`
})
```

---

## Validación de Contraseñas

### Reglas de Validación

| Campo | Regla |
|-------|-------|
| `currentPassword` | Requerido |
| `newPassword` | Mínimo 6 caracteres, máximo 100 |
| `confirmPassword` | Debe coincidir con `newPassword` |
| **Nueva regla** | `newPassword` debe ser diferente a `currentPassword` |

### Implementación (Zod Schema)

```typescript
// backend/validations/auth/user-validation.ts

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(100),
  confirmPassword: z.string().min(1),
})
.refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
.refine((data) => data.currentPassword !== data.newPassword, {
  message: 'La nueva contraseña debe ser diferente a la actual',
  path: ['newPassword'],
})
```

### Validación en Backend (Defense in Depth)

Además de la validación en el schema, el repositorio también verifica:

```typescript
// backend/repositories/auth/user-repository.ts

if (currentPassword === newPassword) {
  throw new Error('La nueva contraseña debe ser diferente a la actual')
}
```

---

## Logging de Seguridad

### Formato de Logs

| Prefijo | Descripción | Ejemplo |
|---------|-------------|---------|
| `[SECURITY]` | Eventos de seguridad (fallos, rate limits) | Intentos de login fallidos |
| `[AUTH]` | Eventos de autenticación exitosos | Login, cambio de contraseña |

### Eventos Registrados

```
[SECURITY] Login failed - user not found: johndoe
[SECURITY] Login failed - invalid password for user: johndoe
[SECURITY] Login failed - inactive user: johndoe
[SECURITY] Rate limit exceeded for login attempt from IP: 192.168.1.1
[SECURITY] Password change failed - invalid current password for user ID: abc123
[SECURITY] Profile update failed - invalid password for user ID: abc123

[AUTH] User logged in successfully: johndoe
[AUTH] Password changed successfully for user ID: abc123
[AUTH] Profile updated for user ID: abc123 (new username: johndoe_new)
```

### Uso en Producción

Estos logs pueden ser:
- Enviados a un servicio de monitoreo (DataDog, Sentry, etc.)
- Almacenados para auditoría
- Configurados con alertas para patrones sospechosos

---

## Protección contra Timing Attacks

### Problema

Los timing attacks pueden revelar información sobre usuarios existentes midiendo el tiempo de respuesta:
- Si el usuario no existe → respuesta rápida (sin comparación de hash)
- Si el usuario existe → respuesta lenta (comparación bcrypt)

### Solución Implementada

Siempre se ejecuta `bcrypt.compare()`, incluso si el usuario no existe:

```typescript
// backend/repositories/auth/user-repository.ts

const DUMMY_HASH = '$2b$10$dummyhashfortimingatttacksprevent'
const passwordToCompare = user?.password || DUMMY_HASH
const isPasswordValid = await bcrypt.compare(password, passwordToCompare)

// Verificar existencia DESPUÉS de la comparación
if (!user) {
  throw new Error('Credenciales inválidas')
}
```

### Mensaje de Error Genérico

Para evitar enumeration attacks, se usa el mismo mensaje para:
- Usuario no encontrado
- Contraseña incorrecta

```
"Credenciales inválidas"
```

---

## Sanitización XSS

### Reglas de Username

| Validación | Descripción |
|------------|-------------|
| Caracteres permitidos | `a-z`, `A-Z`, `0-9`, `_` |
| Longitud mínima | 3 caracteres |
| Longitud máxima | 50 caracteres |

### Implementación

**1. Validación con Zod (Frontend + Backend):**

```typescript
// backend/validations/auth/user-validation.ts

username: z.string()
  .min(3)
  .max(50)
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos')
```

**2. Sanitización en Repositorio (Defense in Depth):**

```typescript
// backend/repositories/auth/user-repository.ts

function sanitizeUsername(username: string): string {
  const sanitized = username.replace(/[^a-zA-Z0-9_]/g, '')
  return sanitized.slice(0, 50)
}
```

### Dónde se Aplica

- `UserRepository.create()` - Creación de usuarios
- `UserRepository.updateProfile()` - Actualización de perfil

---

## Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `backend/middlewares/rateLimiter.ts` | **NUEVO** - Middleware de rate limiting |
| `backend/routes/auth/auth-routes.ts` | Añadidos rate limiters a rutas |
| `backend/validations/auth/user-validation.ts` | Validación: password diferente |
| `backend/repositories/auth/user-repository.ts` | Timing-safe login, XSS, logging |
| `backend/controllers/auth/auth-controllers.ts` | Manejo de nuevos errores |
| `backend/package.json` | Dependencia: `express-rate-limit` |

---

## Dependencias Añadidas

```json
{
  "dependencies": {
    "express-rate-limit": "^8.2.1"
  }
}
```

---

## Recomendaciones Futuras

1. **Implementar CAPTCHA** después de N intentos fallidos
2. **Bloqueo temporal de cuenta** después de muchos intentos fallidos
3. **Notificación por email** cuando se cambia la contraseña
4. **2FA (Two-Factor Authentication)** para cuentas sensibles
5. **Auditoría completa** con tabla de logs en base de datos
6. **Rotación de tokens** más agresiva para sesiones sensibles

---

## Testing

### Probar Rate Limiting

```bash
# Intentar login 6 veces seguidas
for i in {1..6}; do
  curl -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
  echo ""
done
```

El 6to intento debería retornar `429 Too Many Requests`.

### Probar Timing Attack Protection

```bash
# Medir tiempo con usuario inexistente
time curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"noexiste","password":"test123"}'

# Medir tiempo con usuario existente pero contraseña incorrecta
time curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"wrongpass"}'
```

Ambos deberían tomar aproximadamente el mismo tiempo.
