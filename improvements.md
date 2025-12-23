# Plan de mejoras - Four Points Hotel App

> Última actualización: 23-dic-2025

---

## Resumen del estado actual

### ✅ Completado

| Área | Descripción |
|------|-------------|
| **Variables de entorno** | Helper `env.ts` unificado, `.env.example` simplificado |
| **Route Handlers** | Validación de método, origen, cookies y mensajes claros |
| **Tokens/Auth** | Solo cookies HttpOnly, eliminado `localStorage` |
| **React Query** | BackOffice, Parking y Maintenance migrados |
| **Seguridad registro** | `/register` protegido (solo admin real) |
| **Demo mode** | Usuario `demo-admin` con restricciones de escritura |
| **Rate limiting** | Login: 5/15min, Password: 3/hora |

### ⏳ Pendiente

| Área | Prioridad | Descripción |
|------|-----------|-------------|
| Política contraseñas | Media | Mínimo 8 chars + complejidad |
| Revocación de sesiones | Media | Invalidar tokens al logout/cambio password |
| NextAuth/middleware | Baja | Decidir activación |
| SSR/prerender | Baja | Dashboards críticos |
| React Query | Baja | Migrar Grupos, Logbooks, Notificaciones |

---

## Mejoras a implementar

### 1. Política de contraseñas más robusta

**Riesgo**: MEDIO  
**Archivo**: `backend/validations/auth/user-validation.ts`

**Problema**: Contraseña mínima de 6 caracteres es débil. NIST recomienda mínimo 8.

**Solución**:
```typescript
password: z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(100, 'La contraseña no puede exceder 100 caracteres')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
  )
```

**Tareas**:
- [ ] Actualizar validación en backend
- [ ] Actualizar mensaje en frontend (`NewUserModal.tsx`)
- [ ] Actualizar contraseñas existentes débiles (opcional)

---

### 2. Revocación de sesiones (invalidar tokens)

**Riesgo**: MEDIO  
**Archivos**: `backend/services/auth/tokenService.ts`, `backend/controllers/auth/auth-controllers.ts`

**Problema**: Si un usuario cambia su contraseña o cierra sesión, sus tokens antiguos siguen válidos hasta que expiren (7 días). Esto significa que si alguien robó las credenciales, puede seguir accediendo.

**Solución**:

1. Crear tabla en BD para tokens invalidados:
```sql
CREATE TABLE revoked_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token_hash VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  INDEX idx_token_hash (token_hash),
  INDEX idx_expires (expires_at)
);
```

2. Implementar lógica:
```typescript
// Al hacer logout o cambio de contraseña, invalidar sesión actual
// Verificar en cada refresh si la sesión fue revocada
// Job de limpieza para eliminar registros expirados
```

**Tareas**:
- [ ] Crear migración SQL para tabla `revoked_sessions`
- [ ] Crear `SessionRepository` para gestionar revocaciones
- [ ] Modificar `logout` para invalidar sesión actual
- [ ] Modificar `updatePassword` para invalidar todas las sesiones del usuario
- [ ] Verificar sesión válida en `refreshToken`
- [ ] Crear cron job de limpieza de registros expirados

---

### 3. NextAuth + middleware (opcional)

**Prioridad**: BAJA

**Estado actual**: Dependencia instalada pero inactiva (`middleware.ts.disabled`).

**Decisión pendiente**: Definir si se activa para unificar auth o se descarta.

**Consideraciones**:
- Cambiaría cómo se obtiene el usuario actual
- Afecta refactors como React Query
- Protección de rutas centralizada

---

### 4. 2FA/MFA para admins (futuro)

**Riesgo**: BAJO-MEDIO  
**Prioridad**: BAJA (mejora opcional)

**Descripción**: Añadir autenticación de dos factores para usuarios admin.

**Solución recomendada**:
- Implementar TOTP (Google Authenticator, Authy)
- Librerías: `speakeasy` o `otplib` para Node.js

**Tareas**:
- [ ] Añadir campo `totp_secret` a tabla `users`
- [ ] Crear endpoints para activar/verificar 2FA
- [ ] UI para escanear QR y verificar código
- [ ] Hacer obligatorio para rol `admin`

---

## Migración React Query (pendiente)

### Módulos por migrar

| Módulo | Complejidad | Beneficio |
|--------|-------------|-----------|
| Grupos | Alta | Cache por entidad, eliminar `refresh*` |
| Logbooks | Media | Sync entre listados y comentarios |
| Notificaciones | Media | Polling automático |
| Mensajería | Alta | `useInfiniteQuery` para paginación |
| Actividad | Baja | Estandarizar estados |

### Patrón de migración

1. Definir `queryKeys` por dominio
2. Convertir funciones API en hooks `useXQuery`/`useXMutation`
3. Sustituir `useEffect` + estado por React Query
4. Mantener Zustand solo para estado UI

---

## SSR/Prerender (pendiente)

**Candidatos**:
- `useParkingStatus` - dashboard con datos iniciales
- `useGroupStore` - precarga de grupo seleccionado

**Beneficio**: Carga inicial más rápida, mejor SEO (si aplica).

**Implementación**: `HydrationBoundary` de React Query.

---

## Limpieza pendiente

```sql
-- Eliminar usuarios de prueba creados durante tests de seguridad
DELETE FROM users WHERE username IN ('testuser999', 'hacker', 'hacker2', 'hacker3', 'test123');
```

---

## Referencias

- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://auth0.com/blog/jwt-handbook/)
- [React Query Documentation](https://tanstack.com/query/latest)
