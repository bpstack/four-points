# Análisis Sistema de Autenticación - Four Points

**Fecha:** 13 Diciembre 2025

---

## 1. PROBLEMA PRINCIPAL DETECTADO

### ¿Por qué en logbooks puedo hacer acciones sin ver "token expirado" pero en maintenance/blacklist sí aparece?

**Respuesta:** Las rutas de logbooks tienen protección **PARCIAL**, no todas las rutas validan el token.

### Rutas de Logbooks - Estado actual

| Ruta | Método | ¿Protegida? | Estado |
|------|--------|-------------|--------|
| `/` | POST (crear) | **NO** | ⚠️ VULNERABLE |
| `/all` | GET | **NO** | ⚠️ VULNERABLE |
| `/department/:id` | GET | **NO** | ⚠️ VULNERABLE |
| `/author/:id` | GET | **NO** | ⚠️ VULNERABLE |
| `/priority/:importance` | GET | **NO** | ⚠️ VULNERABLE |
| `/day/:day` | GET | **NO** | ⚠️ VULNERABLE |
| `/:id/history` | GET | **NO** | ⚠️ VULNERABLE |
| `/trashed` | GET | **SÍ** | ✅ OK |
| `/:id` | PUT (editar) | **SÍ** | ✅ OK |
| `/:id` | DELETE | **SÍ** | ✅ OK |

### Rutas de Maintenance y Blacklist

Ambos módulos usan `router.use(authenticateToken)` que protege **TODAS** las rutas automáticamente.

```typescript
// maintenance-routes.ts y blacklist-routes.ts
router.use(authenticateToken)  // ← Protege TODO
```

**Por eso cualquier request sin token válido → 401 "Token expirado"**

---

## 2. OTROS PROBLEMAS ENCONTRADOS

### 2.1 Inconsistencia de TTL (Time To Live)

| Ubicación | Access Token TTL | Refresh Token TTL |
|-----------|------------------|-------------------|
| Backend (real) | 15 minutos | 8 horas |
| Frontend cookies | **7 días** ❌ | **30 días** ❌ |
| localStorage | Indefinido | Indefinido |

**Problema:** El frontend guarda cookies con TTL mucho mayor que la validez real del token, causando que se envíen tokens expirados constantemente.

### 2.2 Middleware de Next.js desactivado

```
frontend/middleware.ts.disabled
```

El archivo tiene un comentario: *"LOL he puesto esto aqui para saltarme todo esto"*

**Impacto:** No hay protección de rutas a nivel de Next.js.

### 2.3 httpOnly desactivado en desarrollo

```javascript
// auth-controllers.js
cookieOptions = {
  httpOnly: IN_DEV_MODE ? false : true,  // ❌ Expone tokens a XSS en dev
}
```

### 2.4 Almacenamiento dual de tokens

El frontend guarda tokens en AMBOS lugares:
- `localStorage`
- Cookies

**Problema:** Posible desincronización entre ambos.

### 2.5 Sin invalidación de tokens en logout

El logout actual solo limpia cookies del cliente, pero el token sigue siendo válido hasta que expire (15 min).

---

## 3. FLUJO ACTUAL DE AUTENTICACIÓN

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN                                    │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuario envía credenciales                                   │
│  2. Backend valida contra BD                                     │
│  3. Genera Access Token (15 min) + Refresh Token (8 hrs)        │
│  4. Guarda en cookies + responde en body                        │
│  5. Frontend guarda en localStorage + cookies (con TTL malo)    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REQUEST PROTEGIDO                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Frontend envía request con token (cookie o header)          │
│  2. authenticateToken middleware verifica:                       │
│     - ¿Existe token? → Si no: 401 "falta token"                 │
│     - ¿Es válido? → Si no: 401 "Token inválido"                 │
│     - ¿Expiró? → Si: 401 "Token expirado"                       │
│  3. Si OK → req.user = payload del token                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ (si 401)
┌─────────────────────────────────────────────────────────────────┐
│                      AUTO-REFRESH                                │
├─────────────────────────────────────────────────────────────────┤
│  1. apiClient detecta 401                                        │
│  2. Verifica si tiene refresh token                             │
│  3. Llama a /api/auth/refresh-token                             │
│  4. Backend genera nuevos tokens                                │
│  5. Reintenta request original                                  │
│  6. Si falla → redirect a /login                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. ARCHIVOS CLAVE DEL SISTEMA ACTUAL

### Backend

| Archivo | Función |
|---------|---------|
| `middlewares/authenticateToken.js` | Valida tokens en cada request |
| `services/tokenService.js` | Genera y verifica tokens JWT |
| `controllers/auth/auth-controllers.js` | Login, logout, refresh, me |
| `routes/auth/auth-routes.js` | Define rutas de auth |
| `middlewares/roleCheck.js` | Control de acceso por rol |

### Frontend

| Archivo | Función |
|---------|---------|
| `app/lib/apiClient.ts` | HTTP client con auto-refresh |
| `app/lib/auth/authService.ts` | Funciones login/logout/me |
| `app/lib/auth/useAuth.tsx` | Context provider de auth |
| `middleware.ts.disabled` | Protección de rutas (DESACTIVADO) |

---

## 5. EVALUACIÓN: ¿MIGRAR A SESSIONS?

### Tu contexto

- **Usuarios:** 10-20 trabajadores internos
- **Plataforma:** Solo web (navegador)
- **Multi-hotel futuro:** Instancias separadas por hotel
- **Complejidad actual:** Sistema JWT con varios bugs

### Comparativa

| Aspecto | JWT Actual | Sessions |
|---------|------------|----------|
| Código | ~830 líneas | ~240 líneas (-71%) |
| Logout real | ❌ Token sigue válido | ✅ Instantáneo |
| Panel admin sesiones | ❌ Complejo | ✅ SELECT * FROM sessions |
| Auto-refresh | ✅ Necesario pero complejo | ❌ No necesario |
| Escalabilidad | ✅ Stateless | ⚠️ Requiere store (MySQL) |
| Apps móviles | ✅ Fácil | ⚠️ Más complejo |

### Ventajas de Sessions para tu caso

1. **10-20 usuarios** → Sessions maneja esto sin problema
2. **Solo web** → Cookies funcionan perfectamente
3. **Panel admin** → Ver/cerrar sesiones es trivial
4. **Multi-hotel** → Cada instancia tiene su BD
5. **Logout real** → Crítico cuando un empleado deja de trabajar
6. **Menos código** → Menos bugs, más fácil de mantener

### Desventajas

1. **Migración** → 2-3 horas de trabajo
2. **Si necesitas app móvil** → Más complejo (pero no imposible)

---

## 6. RECOMENDACIÓN FINAL

### Para tu contexto específico: **MIGRAR A SESSIONS** ✅

```
Hotel interno + 10-20 usuarios + Solo web + Multi-hotel separado
                              ↓
                 SESSIONS ES LA MEJOR OPCIÓN
```

---

## 7. ACCIÓN URGENTE (INDEPENDIENTE DE LA MIGRACIÓN)

### Problema crítico: Rutas de logbooks sin protección

**Archivo:** `backend/routes/logbook/logbook-routes.js`

**Solución:** Añadir `router.use(authenticateToken)` al inicio:

```javascript
import { authenticateToken } from '../../middlewares/authenticateToken.js'

const router = Router()

// Proteger TODAS las rutas
router.use(authenticateToken)

// ... resto de rutas
```

### También deberías:

1. **Habilitar middleware de Next.js** → Renombrar `middleware.ts.disabled` a `middleware.ts`
2. **Corregir TTL de cookies** en `authService.ts`
3. **Activar httpOnly** incluso en desarrollo (usar proxy para debugging)

---

## 8. PLAN DE ACCIÓN PROPUESTO

### Opción A: Arreglar primero, migrar después (RECOMENDADO)

| Paso | Tarea | Tiempo |
|------|-------|--------|
| 1 | Proteger rutas de logbooks | 30 min |
| 2 | Verificar que el problema se resuelve | 15 min |
| 3 | Planificar migración a sessions | Próxima semana |
| 4 | Ejecutar migración siguiendo `authSystemMigration.md` | 2-3 hrs |

### Opción B: Migrar directamente

| Paso | Tarea | Tiempo |
|------|-------|--------|
| 1 | Crear branch de migración | 5 min |
| 2 | Seguir FASE 1-7 del documento | 2-3 hrs |
| 3 | Testing completo | 30 min |
| 4 | Deploy | Variable |

---

## 9. PREGUNTAS PENDIENTES

Para confirmar la mejor estrategia:

1. **¿Cómo será el multi-hotel?**
   - [ ] BD separada por hotel
   - [ ] BD compartida con tenant_id
   - [ ] Instancias completamente independientes

2. **¿Hay planes de app móvil nativa?**
   - [ ] No, solo web
   - [ ] Sí, en el futuro cercano
   - [ ] Posiblemente, pero no pronto

3. **¿Prefieres arreglar el sistema actual primero o migrar directamente?**
   - [ ] Arreglar primero (más conservador)
   - [ ] Migrar directamente (más eficiente a largo plazo)

---

## 10. RECURSOS

- **Documento de migración completo:** `backend/authSystemMigration.md`
- **Rutas de logbooks:** `backend/routes/logbook/logbook-routes.js`
- **Middleware de auth:** `backend/middlewares/authenticateToken.js`
- **Token service:** `backend/services/tokenService.js`
